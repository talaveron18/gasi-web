import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import crypto from "node:crypto";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const env=(name:string)=>Netlify.env.get(name)||"";
const b64=(v:Buffer|string)=>Buffer.from(v).toString("base64url");
const bearer=(req:Request)=>{const value=req.headers.get("authorization")||"";return value.startsWith("Bearer ")?value.slice(7):"";};
const profile=(w:any)=>({id:w.id,role:w.role,display_name:w.display_name,centers:w.centers||[],operational_state:w.active?"ACTIVE":"REVOKED",delegated_privileges:w.delegated_privileges||[]});

function secret(){
  const value=env("GASI_INTERNAL_SESSION_SECRET");
  if(Buffer.byteLength(value)<32)throw new Error("session_secret_not_configured");
  return value;
}
function sign(payload:any){
  const encoded=b64(JSON.stringify(payload));
  const sig=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");
  return `v1.${encoded}.${sig}`;
}
function decode(token:string){
  const [version,encoded,supplied]=token.split(".");
  if(version!=="v1"||!encoded||!supplied)throw new Error("invalid_session_token");
  const expected=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");
  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))throw new Error("invalid_session_token");
  const p=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
  if(!p.sub||!p.exp||!p.av||Date.now()>=Number(p.exp)*1000)throw new Error("session_expired_or_revoked");
  return p;
}
async function actor(req:Request,db:any){
  const token=bearer(req);if(!token)throw new Error("missing_session");
  const p=decode(token);
  const rows=await db.sql`SELECT id,role,display_name,centers,active,auth_version,delegated_privileges FROM internal_clinical_workers WHERE id=${String(p.sub)} LIMIT 1`;
  const w=rows[0];
  if(!w||!w.active||Number(w.auth_version)!==Number(p.av))throw new Error("session_expired_or_revoked");
  return w;
}
async function audit(db:any,w:any,action:string,metadata:any={}){
  const client=await db.pool.connect();
  try{
    await client.query("BEGIN");
    const last=await client.query("SELECT event_hash FROM internal_clinical_audit ORDER BY seq DESC LIMIT 1 FOR UPDATE");
    const previous=last.rows[0]?.event_hash||null;
    const at=new Date().toISOString();
    const canonical=JSON.stringify({at,actor_id:w.id,actor_role:w.role,action,episode_id:null,metadata,previous_hash:previous});
    const hash=crypto.createHash("sha256").update(canonical).digest("hex");
    await client.query("INSERT INTO internal_clinical_audit(at,actor_id,actor_role,action,metadata,previous_hash,event_hash) VALUES($1,$2,$3,$4,$5,$6,$7)",[at,w.id,w.role,action,metadata,previous,hash]);
    await client.query("COMMIT");
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}
async function verifyPassword(password:string,stored:string){
  if(!stored.startsWith("scrypt$"))return false;
  const [,salt,key]=stored.split("$");if(!salt||!key)return false;
  const derived=await new Promise<Buffer>((resolve,reject)=>crypto.scrypt(password,salt,32,(e,d)=>e?reject(e):resolve(d as Buffer)));
  return crypto.timingSafeEqual(derived,Buffer.from(key,"hex"));
}

export default async (req:Request,_context:Context)=>{
  const db=getDatabase();const url=new URL(req.url);const path=url.pathname;
  try{
    if(req.method==="GET"&&path==="/api/internal-clinical/health"){await db.sql`SELECT 1`;return json({ok:true,storage:"netlify-database"});}
    if(req.method==="POST"&&path==="/api/internal-clinical/login"){
      const body=await req.json() as any;const id=String(body.worker_id||"").trim();
      const rows=await db.sql`SELECT * FROM internal_clinical_workers WHERE id=${id} LIMIT 1`;const w=rows[0];
      if(!w||!w.active||!(await verifyPassword(String(body.password||""),w.password_hash)))return json({detail:"invalid_credentials"},401);
      const ttl=Math.min(480,Math.max(1,Number(env("GASI_INTERNAL_SESSION_TTL_MINUTES")||30)));const now=Math.floor(Date.now()/1000);
      const token=sign({sid:crypto.randomUUID(),sub:w.id,iat:now,exp:now+ttl*60,av:Number(w.auth_version)});
      await audit(db,w,"LOGIN_SUCCESS");return json({token,expires_at:new Date((now+ttl*60)*1000).toISOString(),profile:profile(w)});
    }
    if(req.method==="GET"&&(path==="/api/internal-clinical/session"||path==="/api/internal-clinical/profile")){
      const w=await actor(req,db);await audit(db,w,path.endsWith("/session")?"SESSION_VALIDATED":"PROFILE_VIEWED");return json(path.endsWith("/session")?{...profile(w),active:true}:profile(w));
    }
    if(req.method==="POST"&&path==="/api/internal-clinical/logout"){
      const w=await actor(req,db);await db.sql`UPDATE internal_clinical_workers SET auth_version=auth_version+1 WHERE id=${w.id}`;await audit(db,w,"LOGOUT_ALL_SESSIONS");return json({ok:true});
    }
    await actor(req,db);return json({detail:"netlify_clinical_route_not_migrated"},501);
  }catch(e:any){
    const code=String(e?.message||"internal_error");
    if(["missing_session","invalid_session_token","session_expired_or_revoked"].includes(code))return json({detail:code},401);
    return json({detail:"internal_error"},500);
  }
};
export const config:Config={path:"/api/internal-clinical/*"};
