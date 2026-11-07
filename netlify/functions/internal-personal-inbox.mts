import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import crypto from "node:crypto";

const MASTER=()=>Netlify.env.get("GASI_MASTER_ACTOR_ID")||"GASI-MASTER-01";
const SECURITY_HEADERS={"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:SECURITY_HEADERS});
const env=(name:string)=>Netlify.env.get(name)||"";
const database=()=>{const connectionString=env("NETLIFY_DB_URL");return connectionString?getDatabase({connectionString}):getDatabase();};
const bearer=(req:Request)=>{const value=req.headers.get("authorization")||"";return value.startsWith("Bearer ")?value.slice(7):"";};
const required=(v:unknown,name:string,max:number)=>{const s=String(v||"").trim();if(!s)throw new Error(`${name}_required`);if(s.length>max)throw new Error(`${name}_too_long`);return s;};
function secret(){const value=env("GASI_INTERNAL_SESSION_SECRET");if(Buffer.byteLength(value)<32)throw new Error("session_secret_not_configured");return value;}
function decode(token:string){const parts=token.split(".");if(parts.length!==3)throw new Error("invalid_session_token");const[version,encoded,supplied]=parts;if(version!=="v1"||!encoded||!supplied)throw new Error("invalid_session_token");const expected=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");if(expected.length!==supplied.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))throw new Error("invalid_session_token");let p:any;try{p=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));}catch{throw new Error("invalid_session_token");}if(typeof p.sub!=="string"||!p.sub||!Number.isSafeInteger(Number(p.exp))||!Number.isSafeInteger(Number(p.av))||Number(p.av)<1||Date.now()>=Number(p.exp)*1000)throw new Error("session_expired_or_revoked");return p;}
async function actor(req:Request,db:any){const token=bearer(req);if(!token)throw new Error("missing_session");const p=decode(token);const rows=await db.sql`SELECT id,tenant_id,role,display_name,centers,active,auth_version FROM internal_clinical_workers WHERE id=${String(p.sub)} LIMIT 1`;const w=rows[0];if(!w||!w.active||Number(w.auth_version)!==Number(p.av)||w.id===MASTER())throw new Error("session_expired_or_revoked");return w;}
function actorCenter(w:any,raw:unknown){const center=required(raw,"center",120);const centers=Array.isArray(w.centers)?w.centers.map(String):[];if(!centers.includes(center))throw new Error("forbidden_center");return center;}
const messageView=(x:any)=>({id:String(x.id),center:String(x.center),sender_worker_id:String(x.sender_worker_id),recipient_worker_id:String(x.recipient_worker_id),subject:String(x.subject),body:String(x.body),created_at:String(x.created_at),read_at:x.read_at?String(x.read_at):null});

export default async (req:Request)=>{
  try{
    const db=database(),w=await actor(req,db),url=new URL(req.url);
    if(req.method==="GET"){
      const center=actorCenter(w,url.searchParams.get("center"));
      const sent=url.searchParams.get("box")==="sent";
      const rows=sent
        ?await db.sql`SELECT id,center,sender_worker_id,recipient_worker_id,subject,body,created_at,read_at FROM internal_personal_messages WHERE tenant_id=${String(w.tenant_id)} AND center=${center} AND sender_worker_id=${String(w.id)} ORDER BY created_at DESC LIMIT 100`
        :await db.sql`SELECT id,center,sender_worker_id,recipient_worker_id,subject,body,created_at,read_at FROM internal_personal_messages WHERE tenant_id=${String(w.tenant_id)} AND center=${center} AND recipient_worker_id=${String(w.id)} ORDER BY created_at DESC LIMIT 100`;
      return json({messages:rows.map(messageView)});
    }
    if(req.method==="POST"){
      const body=await req.json().catch(()=>({})) as any,center=actorCenter(w,body.center),recipient=required(body.recipient_worker_id,"recipient_worker_id",120),subject=required(body.subject,"subject",180),text=required(body.body,"body",8000);
      if(recipient===String(w.id))throw new Error("recipient_self_forbidden");
      const recipientRows=await db.sql`SELECT id FROM internal_clinical_workers WHERE id=${recipient} AND tenant_id=${String(w.tenant_id)} AND active=TRUE AND centers ? ${center} LIMIT 1`;
      if(!recipientRows[0])throw new Error("recipient_not_available");
      const rows=await db.sql`INSERT INTO internal_personal_messages(tenant_id,center,sender_worker_id,recipient_worker_id,subject,body) VALUES(${String(w.tenant_id)},${center},${String(w.id)},${recipient},${subject},${text}) RETURNING id,center,sender_worker_id,recipient_worker_id,subject,body,created_at,read_at`;
      return json({message:messageView(rows[0])},201);
    }
    if(req.method==="PATCH"){
      const body=await req.json().catch(()=>({})) as any,center=actorCenter(w,body.center),id=required(body.id,"message_id",40);
      if(!/^\d+$/.test(id))throw new Error("invalid_message_id");
      const rows=await db.sql`UPDATE internal_personal_messages SET read_at=COALESCE(read_at,NOW()) WHERE id=${id}::bigint AND tenant_id=${String(w.tenant_id)} AND center=${center} AND recipient_worker_id=${String(w.id)} RETURNING id,center,sender_worker_id,recipient_worker_id,subject,body,created_at,read_at`;
      if(!rows[0])return json({error:"message_not_found"},404);
      return json({message:messageView(rows[0])});
    }
    return json({error:"method_not_allowed"},405);
  }catch(error:any){const code=String(error?.message||"internal_error");if(["missing_session","invalid_session_token","session_expired_or_revoked"].includes(code))return json({error:"unauthorized"},401);if(code==="forbidden_center")return json({error:code},403);if(code==="recipient_not_available")return json({error:code},404);if(code.endsWith("_required")||code.endsWith("_too_long")||code.startsWith("invalid_")||code==="recipient_self_forbidden")return json({error:code},400);console.error("internal_personal_inbox_error",{code});return json({error:"internal_error"},500);}
};

export const config:Config={path:"/api/internal-personal-inbox"};
