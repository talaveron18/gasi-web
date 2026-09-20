import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";

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
async function json(response){
  const text=await response.text();
  return text?JSON.parse(text):null;
}
function request(pathname,{method="GET",token,body,ip="10.20.0.10"}={}){
  const headers={"user-agent":"Mozilla/5.0 Chrome/153","x-nf-client-connection-ip":ip};
  if(token)headers.authorization=`Bearer ${token}`;
  if(body!==undefined)headers["content-type"]="application/json";
  return new Request(`http://localhost${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
const syntheticSecret=()=>crypto.randomBytes(32).toString("base64url");

test("runtime: tenant boundary survives identical center ids across clients",{skip:!enabled},async()=>{
  const pool=new Pool({connectionString});
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await applyMigrations(pool);

  const masterCredential=syntheticSecret();
  const secrets={
    NETLIFY_DB_URL:connectionString,
    GASI_INTERNAL_SESSION_SECRET:syntheticSecret(),
    GASI_RECOVERY_SIGNING_SECRET:syntheticSecret(),
    GASI_MASTER_ACTOR_ID:"GASI-MASTER-01",
    GASI_MASTER_PASSWORD:masterCredential,
    GASI_MASTER_DISPLAY_NAME:"Tenant Master",
    GASI_INTERNAL_SESSION_TTL_MINUTES:"30"
  };
  globalThis.Netlify={env:{get:name=>secrets[name]||""}};
  const {default:handler}=await import("../functions/internal-clinical.mts?tenant-isolation");

  const credentialA=syntheticSecret();
  const credentialB=syntheticSecret();
  const adminCredential=syntheticSecret();
  const [hashA,hashB,adminHash]=await Promise.all([
    bcrypt.hash(credentialA,12),
    bcrypt.hash(credentialB,12),
    bcrypt.hash(adminCredential,12)
  ]);

  await pool.query(
    "INSERT INTO internal_clinical_workers(id,tenant_id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES"+
    "('NURSE-TA','TENANT-A','nurse','Nurse tenant A','[\"HQ\"]'::jsonb,TRUE,1,'[]'::jsonb,$1),"+
    "('NURSE-TB','TENANT-B','nurse','Nurse tenant B','[\"HQ\"]'::jsonb,TRUE,1,'[]'::jsonb,$2),"+
    "('ADMIN-TA','TENANT-A','admin','Admin tenant A','[]'::jsonb,TRUE,1,'[]'::jsonb,$3)",
    [hashA,hashB,adminHash]
  );

  await pool.query(
    "INSERT INTO internal_clinical_episodes(id,tenant_id,center,patient_ref,discipline,level,status,document) VALUES"+
    "('EP-TA','TENANT-A','HQ','PAT-A','nursing',2,'ABIERTO',$1::jsonb),"+
    "('EP-TB','TENANT-B','HQ','PAT-B','nursing',2,'ABIERTO',$2::jsonb)",
    [JSON.stringify({summary:"tenant A clinical narrative"}),JSON.stringify({summary:"tenant B clinical narrative"})]
  );

  let res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-TA",password:credentialA},ip:"10.20.0.11"}),{});
  assert.equal(res.status,200);
  const tokenA=(await json(res)).token;

  res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-TB",password:credentialB},ip:"10.20.0.12"}),{});
  assert.equal(res.status,200);
  const tokenB=(await json(res)).token;

  res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"ADMIN-TA",password:adminCredential},ip:"10.20.0.13"}),{});
  assert.equal(res.status,200);
  const adminTokenA=(await json(res)).token;

  res=await handler(request("/api/internal-clinical/episodes",{token:tokenA}),{});
  assert.equal(res.status,200);
  assert.deepEqual((await json(res)).map(x=>x.id),["EP-TA"]);

  res=await handler(request("/api/internal-clinical/episodes/EP-TB",{token:tokenA}),{});
  assert.equal(res.status,404);
  assert.equal((await json(res)).detail,"episode_not_visible");

  res=await handler(request("/api/internal-clinical/episodes/EP-TA",{token:tokenB}),{});
  assert.equal(res.status,404);
  assert.equal((await json(res)).detail,"episode_not_visible");

  res=await handler(request("/api/internal-clinical/episodes",{token:adminTokenA}),{});
  assert.equal(res.status,200);
  assert.deepEqual((await json(res)).map(x=>x.id),["EP-TA"]);

  res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:tokenA,body:{patient_ref:"PAT-A2",center:"HQ",summary:"new tenant A case",level:2}}),{});
  assert.equal(res.status,201);
  const created=await json(res);
  assert.equal(created.tenant_id,"TENANT-A");
  const stored=(await pool.query("SELECT tenant_id,center FROM internal_clinical_episodes WHERE id=$1",[created.id])).rows[0];
  assert.equal(stored.tenant_id,"TENANT-A");
  assert.equal(stored.center,"HQ");

  await pool.end();
});
