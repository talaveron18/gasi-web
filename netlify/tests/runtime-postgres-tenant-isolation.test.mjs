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
function request(pathname,{method="GET",token,body,ip="10.20.0.10",cookie}={}){
  const headers={"user-agent":"Mozilla/5.0 Chrome/153","x-nf-client-connection-ip":ip};
  if(token)headers.authorization=`Bearer ${token}`;
  if(cookie)headers.cookie=cookie;
  if(body!==undefined)headers["content-type"]="application/json";
  return new Request(`http://localhost${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
const syntheticSecret=()=>crypto.randomBytes(32).toString("base64url");
const canonical=value=>value===null||typeof value!=="object"?JSON.stringify(value):Array.isArray(value)?"["+value.map(canonical).join(",")+"]":"{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
const responseCookie=response=>{const values=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")||""];return values.filter(Boolean).map(v=>v.split(";")[0]).join("; ");};

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

  res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:masterCredential},ip:"10.20.0.14"}),{});
  assert.equal(res.status,200);
  const masterToken=(await json(res)).token;

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

  res=await handler(request("/api/internal-clinical/episodes/EP-TB",{token:adminTokenA}),{});
  assert.equal(res.status,404);

  res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:tokenA,body:{patient_ref:"PAT-A2",center:"HQ",summary:"new tenant A case",level:2}}),{});
  assert.equal(res.status,201);
  const created=await json(res);
  assert.equal(created.tenant_id,"TENANT-A");
  const stored=(await pool.query("SELECT tenant_id,center FROM internal_clinical_episodes WHERE id=$1",[created.id])).rows[0];
  assert.equal(stored.tenant_id,"TENANT-A");
  assert.equal(stored.center,"HQ");

  // Delegated exceptional read stays inside the worker tenant even when center ids collide.
  res=await handler(request("/api/internal-clinical/workers/NURSE-TB/privileges/grant",{method:"POST",token:masterToken,body:{privilege:"clinical_privileged_read"}}),{});
  assert.equal(res.status,200);
  res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-TB",password:credentialB},ip:"10.20.0.15"}),{});
  assert.equal(res.status,200);
  const tokenBPrivileged=(await json(res)).token;
  res=await handler(request("/api/internal-clinical/episodes/EP-TA/privileged-access",{method:"POST",token:tokenBPrivileged,body:{reason:"inspection",reference:"TENANT-CROSS-READ"}}),{});
  assert.equal(res.status,403);
  assert.equal((await json(res)).detail,"privileged_access_center_denied");

  // A fixed workstation for tenant A cannot be used by tenant B even at the same center and network.
  res=await handler(request("/api/internal-clinical/workstations",{method:"POST",token:masterToken,body:{id:"WS-TA-HQ",tenant_id:"TENANT-A",center:"HQ",label:"Tenant A HQ"}}),{});
  assert.equal(res.status,201);
  const workstation=await json(res);
  res=await handler(request("/api/internal-clinical/workstations/WS-TA-HQ/claim",{method:"POST",token:masterToken,body:{enrollment_credential:workstation.workstation_enrollment_credential},ip:"10.20.0.50"}),{});
  assert.equal(res.status,200);
  const workstationCookie=responseCookie(res);
  assert.match(workstationCookie,/gasi_ws_id=WS-TA-HQ/);
  assert.match(workstationCookie,/gasi_ws_secret=/);

  res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:tokenBPrivileged,cookie:workstationCookie,ip:"10.20.0.50"}),{});
  assert.equal(res.status,403);
  assert.equal((await json(res)).detail,"workstation_tenant_denied");

  res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:tokenA,cookie:workstationCookie,ip:"10.20.0.50"}),{});
  assert.equal(res.status,201);

  // Recovery V3 rejects a correctly signed snapshot whose attendance tenant is cross-wired.
  res=await handler(request("/api/internal-clinical/recovery/snapshot",{token:masterToken}),{});
  assert.equal(res.status,200);
  const snapshot=await json(res);
  assert.equal(snapshot.schema_version,3);
  const tampered=structuredClone(snapshot);
  const attendanceA=tampered.attendance.find(x=>x.worker_id==="NURSE-TA");
  assert.ok(attendanceA);
  attendanceA.tenant_id="TENANT-B";
  const payload={schema_version:tampered.schema_version,episodes:tampered.episodes,workers:tampered.workers,audit:tampered.audit,counters:tampered.counters,workstations:tampered.workstations,attendance:tampered.attendance};
  tampered.snapshot_signature=crypto.createHmac("sha256",secrets.GASI_RECOVERY_SIGNING_SECRET).update(canonical(payload)).digest("hex");
  res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:tampered}),{});
  assert.equal(res.status,422);
  assert.equal((await json(res)).detail,"invalid_recovery_snapshot_references");

  // Revocation invalidates the delegated token immediately.
  res=await handler(request("/api/internal-clinical/workers/NURSE-TB/privileges/revoke",{method:"POST",token:masterToken,body:{privilege:"clinical_privileged_read"}}),{});
  assert.equal(res.status,200);
  res=await handler(request("/api/internal-clinical/attendance",{token:tokenBPrivileged}),{});
  assert.equal(res.status,401);
  assert.equal((await json(res)).detail,"session_expired_or_revoked");

  await pool.end();
});
