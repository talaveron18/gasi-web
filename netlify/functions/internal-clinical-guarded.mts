import type { Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import crypto from "node:crypto";
import internalClinical from "./internal-clinical.mts";

const MASTER_TENANT="__MASTER__";
const SECURITY_HEADERS={"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:SECURITY_HEADERS});
const env=(name:string)=>Netlify.env.get(name)||"";
const b64=(v:Buffer|string)=>Buffer.from(v).toString("base64url");
const bearer=(req:Request)=>{const value=req.headers.get("authorization")||"";return value.startsWith("Bearer ")?value.slice(7):"";};

function secret(){const value=env("GASI_INTERNAL_SESSION_SECRET");if(Buffer.byteLength(value)<32)throw new Error("session_secret_not_configured");return value;}
function sign(payload:any){const encoded=b64(JSON.stringify(payload));const sig=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");return `v1.${encoded}.${sig}`;}
function decode(token:string){
 const parts=token.split(".");if(parts.length!==3)throw new Error("invalid_session_token");
 const[version,encoded,supplied]=parts;if(version!=="v1"||!encoded||!supplied)throw new Error("invalid_session_token");
 const expected=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");
 if(expected.length!==supplied.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))throw new Error("invalid_session_token");
 let p:any;try{p=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));}catch{throw new Error("invalid_session_token");}
 if(typeof p.sub!=="string"||!p.sub||typeof p.tenant_id!=="string"||!p.tenant_id||typeof p.sid!=="string"||!p.sid||!Number.isSafeInteger(Number(p.iat))||!Number.isSafeInteger(Number(p.exp))||!Number.isSafeInteger(Number(p.av))||Number(p.av)<1||Number(p.exp)<=Number(p.iat)||Date.now()>=Number(p.exp)*1000)throw new Error("session_expired_or_revoked");
 return p;
}
function database(){const connectionString=env("NETLIFY_DB_URL");return connectionString?getDatabase({connectionString}):getDatabase();}
async function tenantBoundSession(req:Request){
 const token=bearer(req);if(!token)throw new Error("missing_session");
 const p=decode(token);const db=database();
 const rows=await db.sql`SELECT id,tenant_id FROM internal_clinical_workers WHERE id=${String(p.sub)} AND tenant_id=${String(p.tenant_id)} LIMIT 1`;
 if(!rows[0])throw new Error("session_expired_or_revoked");
 if(String(p.tenant_id)===MASTER_TENANT&&String(rows[0].tenant_id)!==MASTER_TENANT)throw new Error("session_expired_or_revoked");
 return p;
}

const guardedInternalClinical=async(req:Request,context:Context)=>{
 const path=new URL(req.url).pathname;
 if(req.method==="GET"&&path==="/api/internal-clinical/health")return internalClinical(req,context);
 if(req.method==="POST"&&(path==="/api/internal-clinical/login"||path==="/api/internal-clinical/master-recovery")){
  const response=await internalClinical(req,context);
  if(path!=="/api/internal-clinical/login"||!response.ok)return response;
  const body=await response.json() as any;
  const tenantId=String(body?.profile?.tenant_id||"");
  if(!tenantId||!body?.token)return json({detail:"session_tenant_unavailable"},500);
  let payload:any;try{const parts=String(body.token).split(".");payload=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));}catch{return json({detail:"session_tenant_unavailable"},500);}
  const headers=new Headers(response.headers);
  return new Response(JSON.stringify({...body,token:sign({...payload,tenant_id:tenantId})}),{status:response.status,headers});
 }
 try{await tenantBoundSession(req);}catch{return json({detail:"session_expired_or_revoked"},401);}
 return internalClinical(req,context);
};

export default guardedInternalClinical;
