import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import pg from "pg";

const connectionString=process.env.GASI_INTEGRATION_DB_URL||"";
const enabled=Boolean(connectionString);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const migrationsDir=path.resolve(__dirname,"../database/migrations");
const {Pool}=pg;

async function applyMigrations(pool){
 for(const dir of fs.readdirSync(migrationsDir).sort()){
  const file=path.join(migrationsDir,dir,"migration.sql");
  if(fs.existsSync(file))await pool.query(fs.readFileSync(file,"utf8"));
 }
}
function token(sub,av,secret){
 const payload={sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1800,av};
 const encoded=Buffer.from(JSON.stringify(payload)).toString("base64url");
 const sig=crypto.createHmac("sha256",secret).update(encoded).digest("base64url");
 return `v1.${encoded}.${sig}`;
}
function request(pathname,{method="GET",token:auth,body}={}){
 const headers={};
 if(auth)headers.authorization=`Bearer ${auth}`;
 if(body!==undefined)headers["content-type"]="application/json";
 return new Request(`http://localhost${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
async function payload(res){const text=await res.text();return text?JSON.parse(text):null;}

test("personal inbox rejects cross-tenant, cross-center and sender impersonation on PostgreSQL",{skip:!enabled},async()=>{
 const pool=new Pool({connectionString});
 await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
 await applyMigrations(pool);
 const secret=crypto.randomBytes(48).toString("base64url");
 globalThis.Netlify={env:{get:name=>({NETLIFY_DB_URL:connectionString,GASI_INTERNAL_SESSION_SECRET:secret,GASI_MASTER_ACTOR_ID:"GASI-MASTER-01"}[name]||"")}};
 const {default:handler}=await import("../functions/internal-personal-inbox.mts");

 await pool.query(`INSERT INTO internal_clinical_workers(id,tenant_id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES
 ('A1','TENANT-A','nurse','A1','["CENTER-A"]'::jsonb,TRUE,1,'[]'::jsonb,'x'),
 ('A2','TENANT-A','nurse','A2','["CENTER-A"]'::jsonb,TRUE,1,'[]'::jsonb,'x'),
 ('A3','TENANT-A','nurse','A3','["CENTER-B"]'::jsonb,TRUE,1,'[]'::jsonb,'x'),
 ('B1','TENANT-B','nurse','B1','["CENTER-A"]'::jsonb,TRUE,1,'[]'::jsonb,'x')`);
 const a1=token("A1",1,secret),a2=token("A2",1,secret),a3=token("A3",1,secret),b1=token("B1",1,secret);

 let res=await handler(request("/api/internal-personal-inbox",{method:"POST",token:a1,body:{center:"CENTER-A",recipient_worker_id:"A2",subject:"hola",body:"mensaje",tenant_id:"TENANT-B",sender_worker_id:"B1"}}));
 assert.equal(res.status,201);
 let sent=(await payload(res)).message;
 assert.equal(sent.sender_worker_id,"A1");
 assert.equal(sent.recipient_worker_id,"A2");
 let stored=(await pool.query("SELECT tenant_id,center,sender_worker_id,recipient_worker_id FROM internal_personal_messages WHERE id=$1",[sent.id])).rows[0];
 assert.deepEqual(stored,{tenant_id:"TENANT-A",center:"CENTER-A",sender_worker_id:"A1",recipient_worker_id:"A2"});

 res=await handler(request("/api/internal-personal-inbox",{method:"POST",token:a1,body:{center:"CENTER-A",recipient_worker_id:"B1",subject:"x",body:"x"}}));
 assert.equal(res.status,404);
 res=await handler(request("/api/internal-personal-inbox",{method:"POST",token:a1,body:{center:"CENTER-A",recipient_worker_id:"A3",subject:"x",body:"x"}}));
 assert.equal(res.status,404);
 res=await handler(request("/api/internal-personal-inbox",{method:"GET",token:a1}));
 assert.equal(res.status,400);
 res=await handler(request("/api/internal-personal-inbox?center=CENTER-B",{token:a1}));
 assert.equal(res.status,403);

 res=await handler(request("/api/internal-personal-inbox?center=CENTER-A",{token:a2}));
 assert.equal(res.status,200);
 assert.equal((await payload(res)).messages.length,1);
 res=await handler(request("/api/internal-personal-inbox?center=CENTER-A",{token:b1}));
 assert.equal(res.status,200);
 assert.equal((await payload(res)).messages.length,0);
 res=await handler(request("/api/internal-personal-inbox?center=CENTER-B",{token:a3}));
 assert.equal(res.status,200);
 assert.equal((await payload(res)).messages.length,0);

 res=await handler(request("/api/internal-personal-inbox",{method:"PATCH",token:b1,body:{center:"CENTER-A",id:sent.id}}));
 assert.equal(res.status,404);
 res=await handler(request("/api/internal-personal-inbox",{method:"PATCH",token:a1,body:{center:"CENTER-A",id:sent.id}}));
 assert.equal(res.status,404);
 res=await handler(request("/api/internal-personal-inbox",{method:"PATCH",token:a2,body:{center:"CENTER-A",id:sent.id}}));
 assert.equal(res.status,200);
 assert.ok((await payload(res)).message.read_at);

 await pool.end();
});
