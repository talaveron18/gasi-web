import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString=process.env.GASI_INTEGRATION_DB_URL||"";
const enabled=Boolean(connectionString);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const migrationsDir=path.resolve(__dirname,"../database/migrations");
const {Pool}=pg;

async function responseJson(response){
 const text=await response.text();
 return text?JSON.parse(text):null;
}
function request(pathname,{method="GET",token,body,cookie,userAgent="Mozilla/5.0 (X11; Linux x86_64) Chrome/153",ip="10.10.0.10"}={}){
 const headers={"user-agent":userAgent,"x-nf-client-connection-ip":ip};
 if(token)headers.authorization=`Bearer ${token}`;
 if(cookie)headers.cookie=cookie;
 if(body!==undefined)headers["content-type"]="application/json";
 return new Request(`http://localhost${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
function cookiesFrom(response){
 const values=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")].filter(Boolean);
 return values.map(value=>value.split(";")[0]).join("; ");
}
async function applyMigrations(pool){
 const dirs=fs.readdirSync(migrationsDir).sort();
 for(const dir of dirs){
  const file=path.join(migrationsDir,dir,"migration.sql");
  if(fs.existsSync(file))await pool.query(fs.readFileSync(file,"utf8"));
 }
}

test("runtime: attendance, workstation binding, isolation and recovery work on PostgreSQL",{skip:!enabled},async()=>{
 const pool=new Pool({connectionString});
 await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
 await applyMigrations(pool);

 const secrets={
  NETLIFY_DB_URL:connectionString,
  GASI_INTERNAL_SESSION_SECRET:"integration-session-secret-at-least-32-bytes-long",
  GASI_MASTER_ACTOR_ID:"GASI-MASTER-01",
  GASI_MASTER_PASSWORD:"MasterIntegrationPassword!123",
  GASI_MASTER_DISPLAY_NAME:"Integration Master",
  GASI_INTERNAL_SESSION_TTL_MINUTES:"30"
 };
 globalThis.Netlify={env:{get:name=>secrets[name]||""}};
 const {default:handler}=await import("../functions/internal-clinical.mts");

 const nursePassword="NurseIntegrationPassword!123";
 const otherPassword="OtherIntegrationPassword!123";
 const nurseHash=await bcrypt.hash(nursePassword,12);
 const otherHash=await bcrypt.hash(otherPassword,12);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'nurse',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["NURSE-A","Nurse A",JSON.stringify(["CENTER-A"]),nurseHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'nurse',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["NURSE-B","Nurse B",JSON.stringify(["CENTER-B"]),otherHash]);

 let res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:secrets.GASI_MASTER_PASSWORD}}),{});
 assert.equal(res.status,200);
 const masterLogin=await responseJson(res);
 const masterToken=masterLogin.token;
 assert.ok(masterToken);

 res=await handler(request("/api/internal-clinical/workstations",{method:"POST",token:masterToken,body:{id:"WS-A",center:"CENTER-A",label:"Centro A fijo"}}),{});
 assert.equal(res.status,201);
 const workstation=await responseJson(res);
 assert.ok(workstation.workstation_enrollment_credential);

 res=await handler(request("/api/internal-clinical/workstations/WS-A/claim",{method:"POST",token:masterToken,body:{enrollment_credential:workstation.workstation_enrollment_credential}}),{});
 assert.equal(res.status,200);
 const workstationCookie=cookiesFrom(res);
 assert.match(workstationCookie,/gasi_ws_id=WS-A/);
 assert.match(workstationCookie,/gasi_ws_secret=/);
 const claimed=await pool.query("SELECT claimed_at,credential_hash FROM internal_center_workstations WHERE id='WS-A'");
 assert.ok(claimed.rows[0].claimed_at);
 assert.equal(await bcrypt.compare(workstation.workstation_enrollment_credential,claimed.rows[0].credential_hash),false);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-A",password:nursePassword},ip:"10.10.0.11"}),{});
 assert.equal(res.status,200);
 const nurseToken=(await responseJson(res)).token;

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,201);
 const firstClockIn=await responseJson(res);
 assert.equal(firstClockIn.event_type,"CLOCK_IN");

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"shift_already_open");

 res=await handler(request("/api/internal-clinical/attendance/clock-out",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,201);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-B",password:otherPassword},ip:"10.10.0.12"}),{});
 assert.equal(res.status,200);
 const otherToken=(await responseJson(res)).token;
 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:otherToken,cookie:workstationCookie}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"workstation_center_denied");

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie,userAgent:"Mozilla/5.0 (Linux; Android 16; Mobile)"}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"mobile_workstation_client_denied");

 res=await handler(request("/api/internal-clinical/workstations/WS-A/revoke",{method:"POST",token:masterToken}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"workstation_not_authorized");
 res=await handler(request("/api/internal-clinical/workstations/WS-A/activate",{method:"POST",token:masterToken}),{});
 assert.equal(res.status,200);

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,201);
 const correctedTarget=await responseJson(res);
 res=await handler(request(`/api/internal-clinical/attendance/${correctedTarget.seq}/correct`,{method:"POST",token:masterToken,body:{corrected_event_type:"CLOCK_OUT",corrected_occurred_at:new Date().toISOString(),reason:"Integración: evento corregido"}}),{});
 assert.equal(res.status,201);

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,201);
 res=await handler(request("/api/internal-clinical/attendance/clock-out",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,201);

 res=await handler(request("/api/internal-clinical/attendance",{token:otherToken}),{});
 assert.equal(res.status,200);
 assert.deepEqual(await responseJson(res),[]);

 res=await handler(request("/api/internal-clinical/recovery/snapshot",{token:masterToken}),{});
 assert.equal(res.status,200);
 const snapshot=await responseJson(res);
 assert.equal(snapshot.schema_version,2);
 assert.ok(snapshot.workstations.find(x=>x.id==="WS-A")?.claimed_at);
 assert.ok(snapshot.attendance.length>=5);

 await pool.query("UPDATE internal_center_workstations SET claimed_at=NULL WHERE id='WS-A'");
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:snapshot}),{});
 assert.equal(res.status,200);
 const restored=await pool.query("SELECT claimed_at,active FROM internal_center_workstations WHERE id='WS-A'");
 assert.ok(restored.rows[0].claimed_at);
 assert.equal(restored.rows[0].active,true);

 await assert.rejects(()=>pool.query("UPDATE internal_attendance_events SET center='CENTER-X' WHERE seq=$1",[firstClockIn.seq]),/append-only/);
 await assert.rejects(()=>pool.query("DELETE FROM internal_attendance_events WHERE seq=$1",[firstClockIn.seq]),/append-only/);

 await pool.end();
});
