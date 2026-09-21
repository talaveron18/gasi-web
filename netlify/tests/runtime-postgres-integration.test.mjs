import "./runtime-postgres-tenant-isolation.test.mjs";
import "./runtime-public-api-postgres.test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const connectionString=process.env.GASI_INTEGRATION_DB_URL||"";
const enabled=Boolean(connectionString);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const migrationsDir=path.resolve(__dirname,"../database/migrations");
const {Pool}=pg;
const syntheticSecret=()=>crypto.randomBytes(32).toString("base64url");

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
function canonical(value){
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
 return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function resignSnapshot(snapshot,secret){
 const payload={schema_version:snapshot.schema_version,patients:snapshot.patients,episodes:snapshot.episodes,workers:snapshot.workers,audit:snapshot.audit,counters:snapshot.counters,workstations:snapshot.workstations,attendance:snapshot.attendance,contingency:snapshot.contingency};
 snapshot.snapshot_signature=crypto.createHmac("sha256",secret).update(canonical(payload)).digest("hex");
 return snapshot;
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
  GASI_INTERNAL_SESSION_SECRET:syntheticSecret(),
  GASI_RECOVERY_SIGNING_SECRET:syntheticSecret(),
  GASI_MASTER_RECOVERY_SECRET:syntheticSecret(),
  GASI_MASTER_ACTOR_ID:"GASI-MASTER-01",
  GASI_MASTER_PASSWORD:syntheticSecret(),
  GASI_MASTER_DISPLAY_NAME:"Integration Master",
  GASI_INTERNAL_SESSION_TTL_MINUTES:"30"
 };
 globalThis.Netlify={env:{get:name=>secrets[name]||""}};
 const {default:handler}=await import("../functions/internal-clinical.mts");

 const nursePassword=syntheticSecret();
 const otherPassword=syntheticSecret();
 const physicianPassword=syntheticSecret();
 const psychologistPassword=syntheticSecret();
 const adminPassword=syntheticSecret();
 const nurseHash=await bcrypt.hash(nursePassword,12);
 const otherHash=await bcrypt.hash(otherPassword,12);
 const physicianHash=await bcrypt.hash(physicianPassword,12);
 const psychologistHash=await bcrypt.hash(psychologistPassword,12);
 const adminHash=await bcrypt.hash(adminPassword,12);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'nurse',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["NURSE-A","Nurse A",JSON.stringify(["CENTER-A"]),nurseHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'nurse',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["NURSE-B","Nurse B",JSON.stringify(["CENTER-B"]),otherHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'physician',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["PHYS-A","Physician A",JSON.stringify(["CENTER-A"]),physicianHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'psychologist',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["PSY-A","Psychologist A",JSON.stringify(["CENTER-A"]),psychologistHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'admin',$2,'[]'::jsonb,TRUE,1,'[]'::jsonb,$3)",["ADMIN-A","Admin A",adminHash]);

 const initialRecoveredMasterPassword=syntheticSecret();
 let res=await handler(request("/api/internal-clinical/master-recovery",{method:"POST",body:{worker_id:"GASI-MASTER-01",recovery_secret:"wrong-recovery-secret",new_password:initialRecoveredMasterPassword},ip:"10.10.0.31"}),{});
 assert.equal(res.status,401);
 assert.match(res.headers.get("x-request-id")||"",/^[0-9a-f-]{36}$/i);
 assert.match(res.headers.get("server-timing")||"",/^app;dur=\d+$/);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_credentials");
 assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM internal_clinical_workers WHERE id='GASI-MASTER-01'")).rows[0].n,0);

 res=await handler(request("/api/internal-clinical/master-recovery",{method:"POST",body:{worker_id:"GASI-MASTER-01",recovery_secret:secrets.GASI_MASTER_RECOVERY_SECRET,new_password:initialRecoveredMasterPassword},ip:"10.10.0.32"}),{});
 assert.equal(res.status,200);
 const initialRecovery=await responseJson(res);
 assert.equal(initialRecovery.account_created,true);
 assert.equal(initialRecovery.session_revoked,true);
 const createdMaster=(await pool.query("SELECT id,tenant_id,role,active,must_change_password FROM internal_clinical_workers WHERE id='GASI-MASTER-01'")).rows[0];
 assert.equal(createdMaster.tenant_id,"__MASTER__");
 assert.equal(createdMaster.role,"admin");
 assert.equal(createdMaster.active,true);
 assert.equal(createdMaster.must_change_password,false);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:secrets.GASI_MASTER_PASSWORD},ip:"10.10.0.33"}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:initialRecoveredMasterPassword},ip:"10.10.0.34"}),{});
 assert.equal(res.status,200);
 let masterToken=(await responseJson(res)).token;
 assert.ok(masterToken);

 res=await handler(request("/api/internal-clinical/master-recovery",{method:"POST",body:{worker_id:"GASI-MASTER-01",recovery_secret:secrets.GASI_MASTER_RECOVERY_SECRET,new_password:initialRecoveredMasterPassword},ip:"10.10.0.35"}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"password_reuse_not_allowed");

 const recoveredMasterPassword=syntheticSecret();
 res=await handler(request("/api/internal-clinical/master-recovery",{method:"POST",body:{worker_id:"GASI-MASTER-01",recovery_secret:secrets.GASI_MASTER_RECOVERY_SECRET,new_password:recoveredMasterPassword},ip:"10.10.0.35"}),{});
 assert.equal(res.status,200);
 const secondRecovery=await responseJson(res);
 assert.equal(secondRecovery.account_created,false);
 assert.equal(secondRecovery.session_revoked,true);

 res=await handler(request("/api/internal-clinical/session",{token:masterToken}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"session_expired_or_revoked");

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:initialRecoveredMasterPassword},ip:"10.10.0.36"}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:recoveredMasterPassword},ip:"10.10.0.37"}),{});
 assert.equal(res.status,200);
 masterToken=(await responseJson(res)).token;
 assert.ok(masterToken);

 const tempPassword=syntheticSecret();
 const permanentPassword=syntheticSecret();
 res=await handler(request("/api/internal-clinical/workers",{method:"POST",token:masterToken,body:{id:"TEMP-NURSE",display_name:"Temporary Nurse",role:"nurse",centers:["CENTER-A"],temporary_password:tempPassword}}),{});
 assert.equal(res.status,201);
 assert.equal((await responseJson(res)).must_change_password,true);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"TEMP-NURSE",password:tempPassword},ip:"10.10.0.20"}),{});
 assert.equal(res.status,200);
 const tempLogin=await responseJson(res);
 const tempToken=tempLogin.token;
 assert.equal(tempLogin.profile.must_change_password,true);

 res=await handler(request("/api/internal-clinical/attendance",{token:tempToken}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"password_change_required");

 res=await handler(request("/api/internal-clinical/password",{method:"POST",token:tempToken,body:{current_password:tempPassword,new_password:"short"}}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_new_password");

 res=await handler(request("/api/internal-clinical/password",{method:"POST",token:tempToken,body:{current_password:tempPassword,new_password:tempPassword}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"password_reuse_not_allowed");

 res=await handler(request("/api/internal-clinical/password",{method:"POST",token:tempToken,body:{current_password:tempPassword,new_password:permanentPassword}}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).session_revoked,true);

 res=await handler(request("/api/internal-clinical/session",{token:tempToken}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"session_expired_or_revoked");

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"TEMP-NURSE",password:tempPassword},ip:"10.10.0.21"}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"TEMP-NURSE",password:permanentPassword},ip:"10.10.0.22"}),{});
 assert.equal(res.status,200);
 const permanentLogin=await responseJson(res);
 assert.equal(permanentLogin.profile.must_change_password,false);
 res=await handler(request("/api/internal-clinical/attendance",{token:permanentLogin.token}),{});
 assert.equal(res.status,200);

 res=await handler(request("/api/internal-clinical/workers/TEMP-NURSE/password-reset",{method:"POST",token:masterToken}),{});
 assert.equal(res.status,200);
 const resetPayload=await responseJson(res);
 assert.equal(resetPayload.must_change_password,true);
 assert.ok(resetPayload.temporary_password);
 assert.notEqual(resetPayload.temporary_password,permanentPassword);

 res=await handler(request("/api/internal-clinical/session",{token:permanentLogin.token}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"session_expired_or_revoked");

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"TEMP-NURSE",password:permanentPassword},ip:"10.10.0.23"}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"TEMP-NURSE",password:resetPayload.temporary_password},ip:"10.10.0.24"}),{});
 assert.equal(res.status,200);
 const resetLogin=await responseJson(res);
 assert.equal(resetLogin.profile.must_change_password,true);
 res=await handler(request("/api/internal-clinical/attendance",{token:resetLogin.token}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"password_change_required");

 for(let i=0;i<8;i++){
  res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"UNKNOWN-RATE-LIMIT",password:syntheticSecret()},ip:"10.10.0.99"}),{});
  assert.equal(res.status,401);
 }
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"UNKNOWN-RATE-LIMIT",password:syntheticSecret()},ip:"10.10.0.99"}),{});
 assert.equal(res.status,429);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"UNKNOWN-RATE-LIMIT",password:syntheticSecret()},ip:"10.10.0.100"}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/workstations",{method:"POST",token:masterToken,body:{id:"WS-A",center:"CENTER-A",label:"Centro A fijo"}}),{});
 assert.equal(res.status,201);
 const workstation=await responseJson(res);
 assert.ok(workstation.workstation_enrollment_credential);

 res=await handler(request("/api/internal-clinical/workstations",{method:"POST",token:masterToken,body:{id:"WS-A-DUP",center:"CENTER-A",label:"Duplicado"}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"workstation_center_already_registered");
 const workstationCount=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_center_workstations WHERE center='CENTER-A'")).rows[0].n;
 assert.equal(workstationCount,1);

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

 res=await handler(request("/api/internal-clinical/contingency/channels",{method:"POST",token:masterToken,body:{tenant_id:"GASI-LEGACY",center:"CENTER-A",channel_type:"PHONE",label:"Synthetic fallback physician",target:"+34910000001",active:true}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/contingency",{token:nurseToken}),{});
 assert.equal(res.status,200);
 const nurseContingency=await responseJson(res);
 assert.equal(nurseContingency.length,1);
 assert.equal(nurseContingency[0].center,"CENTER-A");
 assert.equal(nurseContingency[0].target,"+34910000001");

 const expiredPayload=Buffer.from(JSON.stringify({sid:"expired-integration",sub:"NURSE-A",iat:1,exp:1,av:1})).toString("base64url");
 const expiredSig=crypto.createHmac("sha256",secrets.GASI_INTERNAL_SESSION_SECRET).update(expiredPayload).digest("base64url");
 const expiredToken=`v1.${expiredPayload}.${expiredSig}`;
 res=await handler(request("/api/internal-clinical/session",{token:expiredToken}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"session_expired_or_revoked");

 await pool.query("INSERT INTO internal_clinical_episodes(id,center,patient_ref,discipline,level,status,document) VALUES('EP-NURSE','CENTER-A','P1','nursing',1,'ABIERTO',$1::jsonb),('EP-PSY','CENTER-A','P2','psychology',1,'ABIERTO',$2::jsonb),('EP-OTHER','CENTER-B','P3','nursing',1,'ABIERTO',$3::jsonb)",[JSON.stringify({summary:"nursing"}),JSON.stringify({summary:"psych"}),JSON.stringify({summary:"other"})]);
 res=await handler(request("/api/internal-clinical/episodes",{token:nurseToken}),{});
 assert.equal(res.status,200);
 const nurseEpisodes=await responseJson(res);
 assert.deepEqual(nurseEpisodes.map(x=>x.id),["EP-NURSE"]);
 res=await handler(request("/api/internal-clinical/episodes/EP-PSY",{token:nurseToken}),{});
 assert.equal(res.status,404);
 assert.equal((await responseJson(res)).detail,"episode_not_visible");

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"workstation_binding_required");

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie,ip:"10.10.0.44"}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"workstation_network_denied");

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

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"PHYS-A",password:physicianPassword},ip:"10.10.0.13"}),{});
 assert.equal(res.status,200);
 const physicianToken=(await responseJson(res)).token;

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"ADMIN-A",password:adminPassword},ip:"10.10.0.14"}),{});
 assert.equal(res.status,200);
 const adminToken=(await responseJson(res)).token;

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"PSY-A",password:psychologistPassword},ip:"10.10.0.15"}),{});
 assert.equal(res.status,200);
 const psychologistToken=(await responseJson(res)).token;

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient:{given_name:"Javier",family_name:"Suárez",second_family_name:"Talaverón",birth_date:"1988-04-12",dni:"12345678Z",employee_number:"EMP-001"},center:"CENTER-A",summary:"Synthetic nursing escalation",level:2}}),{});
 assert.equal(res.status,201);
 const episode=await responseJson(res);
 assert.equal(episode.status,"ABIERTO");
 assert.equal(episode.discipline,"nursing");
 assert.match(episode.patient_id,/^GASI-PT-\d{8}$/);
 assert.match(episode.patient_ref,/^GASI-HC-\d{8}$/);
 assert.equal(episode.patient.medical_record_number,episode.patient_ref);
 assert.equal(episode.patient.dni,"12345678Z");

 res=await handler(request("/api/internal-clinical/patients/search?q=suarez%20javi",{token:nurseToken}),{});
 assert.equal(res.status,200);
 const fuzzyPatients=await responseJson(res);
 assert.equal(fuzzyPatients[0].id,episode.patient_id);
 assert.equal(fuzzyPatients[0].medical_record_number,episode.patient_ref);
 assert.ok(fuzzyPatients[0].match_score>.5);

 res=await handler(request("/api/internal-clinical/patients/search?q=12345678Z",{token:nurseToken}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res))[0].id,episode.patient_id);

 res=await handler(request("/api/internal-clinical/patients/search?q=Javier",{token:adminToken}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"clinical_role_required");

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient:{given_name:"Javi",family_name:"Suarez",age_years:38,dni:"12.345.678-Z"},center:"CENTER-A",summary:"Duplicate strong identifier must fail",level:2}}),{});
 assert.equal(res.status,409);
 const duplicateByDni=await responseJson(res);
 assert.equal(duplicateByDni.detail,"patient_identifier_conflict");
 assert.equal(duplicateByDni.candidate.id,episode.patient_id);

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient:{given_name:"Javier",family_name:"Suárez",second_family_name:"Talaverón",birth_date:"1988-04-12"},center:"CENTER-A",summary:"Probable duplicate must require confirmation",level:2}}),{});
 assert.equal(res.status,409);
 const probableDuplicate=await responseJson(res);
 assert.equal(probableDuplicate.detail,"probable_duplicate_patient");
 assert.equal(probableDuplicate.candidate.id,episode.patient_id);

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient:{given_name:"Javier",family_name:"Suárez",second_family_name:"Talaverón",birth_date:"1988-04-12",employee_number:"EMP-DISTINCT-002"},confirm_distinct_from_patient_id:episode.patient_id,center:"CENTER-A",summary:"Explicitly confirmed distinct person",level:2}}),{});
 assert.equal(res.status,201);
 const distinctPatientEpisode=await responseJson(res);
 assert.notEqual(distinctPatientEpisode.patient_id,episode.patient_id);
 assert.notEqual(distinctPatientEpisode.patient_ref,episode.patient_ref);
 const overrideAudit=(await pool.query("SELECT metadata FROM internal_clinical_audit WHERE action='PATIENT_DUPLICATE_WARNING_OVERRIDDEN' ORDER BY seq DESC LIMIT 1")).rows[0];
 assert.ok(overrideAudit);
 assert.equal(overrideAudit.metadata.candidate_patient_id,episode.patient_id);
 assert.equal(JSON.stringify(overrideAudit.metadata).includes("Javier"),false);

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient_id:episode.patient_id,center:"CENTER-A",summary:"Second episode same stable history",level:2}}),{});
 assert.equal(res.status,201);
 const samePatientEpisode=await responseJson(res);
 assert.equal(samePatientEpisode.patient_id,episode.patient_id);
 assert.equal(samePatientEpisode.patient_ref,episode.patient_ref);

 const patientSearchAudit=await pool.query("SELECT metadata FROM internal_clinical_audit WHERE action='PATIENT_SEARCHED' ORDER BY seq DESC LIMIT 1");
 assert.ok(patientSearchAudit.rows[0]);
 assert.equal(JSON.stringify(patientSearchAudit.rows[0].metadata).includes("12345678"),false);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/level`,{method:"POST",token:nurseToken,body:{level:3}}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).level,3);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}`,{token:adminToken}),{});
 assert.equal(res.status,200);
 const adminEpisode=await responseJson(res);
 assert.equal(adminEpisode.id,episode.id);
 assert.equal(adminEpisode.center,"CENTER-A");
 assert.equal("patient_ref" in adminEpisode,false);
 assert.equal("document" in adminEpisode,false);
 assert.equal("summary" in adminEpisode,false);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/addenda`,{method:"POST",token:adminToken,body:{text:"Administrative narrative write must fail"}}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"episode_write_denied");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/privileged-access`,{method:"POST",token:adminToken,body:{reason:"inspection",reference:"INT-ADMIN-001"}}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"privileged_access_required");

 const privilegedBeforeInvalid=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_clinical_audit WHERE action='PRIVILEGED_EPISODE_ACCESSED'")).rows[0].n;
 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/privileged-access`,{method:"POST",token:masterToken,body:{reason:"free text should fail",reference:"INT-MASTER-BAD"}}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_privileged_access_reason");
 const privilegedAfterInvalid=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_clinical_audit WHERE action='PRIVILEGED_EPISODE_ACCESSED'")).rows[0].n;
 assert.equal(privilegedAfterInvalid,privilegedBeforeInvalid);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/privileged-access`,{method:"POST",token:masterToken,body:{reason:"inspection",reference:"INT-MASTER-001"}}),{});
 assert.equal(res.status,200);
 const masterPrivileged=await responseJson(res);
 assert.equal(masterPrivileged.summary,"Synthetic nursing escalation");
 assert.equal(masterPrivileged.privileged_access.read_only,true);
 const privilegedAudit=await pool.query("SELECT action,metadata FROM internal_clinical_audit WHERE action='PRIVILEGED_EPISODE_ACCESSED' ORDER BY seq DESC LIMIT 1");
 assert.equal(privilegedAudit.rows[0].action,"PRIVILEGED_EPISODE_ACCESSED");
 assert.equal(privilegedAudit.rows[0].metadata.episode_id,episode.id);

 res=await handler(request("/api/internal-clinical/episodes",{token:nurseToken}),{});
 assert.equal(res.status,200);
 const nurseCollection=await responseJson(res);
 const nurseCollectionEpisode=nurseCollection.find(x=>x.id===episode.id);
 assert.ok(nurseCollectionEpisode);
 assert.equal(nurseCollectionEpisode.status,"ABIERTO");
 assert.equal("summary" in nurseCollectionEpisode,false);
 assert.equal("patient_ref" in nurseCollectionEpisode,false);
 const collectionAudit=await pool.query("SELECT action,metadata FROM internal_clinical_audit WHERE action='EPISODE_COLLECTION_VIEWED' ORDER BY seq DESC LIMIT 1");
 assert.equal(collectionAudit.rows[0].metadata.metadata_only,true);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}`,{token:nurseToken}),{});
 assert.equal(res.status,200);
 const nurseFullEpisode=await responseJson(res);
 assert.equal(nurseFullEpisode.summary,"Synthetic nursing escalation");
 assert.equal(nurseFullEpisode.patient_ref,episode.patient_ref);
 assert.equal(nurseFullEpisode.patient_id,episode.patient_id);
 const directReadAudit=await pool.query("SELECT action,metadata FROM internal_clinical_audit WHERE action='EPISODE_VIEWED' AND episode_id=$1 ORDER BY seq DESC LIMIT 1",[episode.id]);
 assert.equal(directReadAudit.rows[0].action,"EPISODE_VIEWED");
 assert.equal(directReadAudit.rows[0].metadata.metadata_only,false);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/addenda`,{method:"POST",token:nurseToken,body:{text:"Original synthetic addendum"}}),{});
 assert.equal(res.status,200);
 const afterAddendum=await responseJson(res);
 const addendum=afterAddendum.addenda.at(-1);
 assert.ok(addendum?.id);
 assert.equal(addendum.text,"Original synthetic addendum");
 assert.deepEqual(addendum.corrections,[]);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/addenda/${addendum.id}/correct`,{method:"POST",token:nurseToken,body:{replacement_text:"Synthetic correction one",reason:"Integration correction one"}}),{});
 assert.equal(res.status,200);
 const afterCorrectionOne=await responseJson(res);
 const correctedOne=afterCorrectionOne.addenda.find(x=>x.id===addendum.id);
 assert.equal(correctedOne.text,"Original synthetic addendum");
 assert.equal(correctedOne.corrections.length,1);
 assert.equal(correctedOne.corrections[0].previous_text,"Original synthetic addendum");
 assert.equal(correctedOne.corrections[0].replacement_text,"Synthetic correction one");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/addenda/${addendum.id}/correct`,{method:"POST",token:nurseToken,body:{replacement_text:"Synthetic correction two",reason:"Integration correction two"}}),{});
 assert.equal(res.status,200);
 const afterCorrectionTwo=await responseJson(res);
 const correctedTwo=afterCorrectionTwo.addenda.find(x=>x.id===addendum.id);
 assert.equal(correctedTwo.text,"Original synthetic addendum");
 assert.equal(correctedTwo.corrections.length,2);
 assert.equal(correctedTwo.corrections[1].previous_text,"Synthetic correction one");
 assert.equal(correctedTwo.corrections[1].replacement_text,"Synthetic correction two");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}`,{token:nurseToken}),{});
 assert.equal(res.status,200);
 const persistedCorrection=(await responseJson(res)).addenda.find(x=>x.id===addendum.id);
 assert.equal(persistedCorrection.text,"Original synthetic addendum");
 assert.equal(persistedCorrection.corrections.at(-1).replacement_text,"Synthetic correction two");
 const correctionAudit=await pool.query("SELECT metadata FROM internal_clinical_audit WHERE action='CLINICAL_ENTRY_CORRECTED' AND episode_id=$1 ORDER BY seq DESC LIMIT 1",[episode.id]);
 assert.equal(correctionAudit.rows[0].metadata.reason_recorded,true);
 assert.equal(JSON.stringify(correctionAudit.rows[0].metadata).includes("Synthetic correction two"),false);

 res=await handler(request("/api/internal-clinical/episodes",{token:physicianToken}),{});
 assert.equal(res.status,200);
 assert.ok((await responseJson(res)).some(x=>x.id===episode.id));

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}`,{token:otherToken}),{});
 assert.equal(res.status,404);
 assert.equal((await responseJson(res)).detail,"episode_not_visible");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/addenda`,{method:"POST",token:otherToken,body:{text:"Foreign write must be denied"}}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"episode_write_denied");

 res=await handler(request("/api/internal-clinical/workers/NURSE-B/privileges/grant",{method:"POST",token:masterToken,body:{privilege:"clinical_privileged_read"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/attendance",{token:otherToken}),{});
 assert.equal(res.status,401);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-B",password:otherPassword},ip:"10.10.0.12"}),{});
 assert.equal(res.status,200);
 const otherPrivilegedToken=(await responseJson(res)).token;
 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/privileged-access`,{method:"POST",token:otherPrivilegedToken,body:{reason:"inspection",reference:"INT-DELEGATED-001"}}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"privileged_access_center_denied");
 res=await handler(request("/api/internal-clinical/workers/NURSE-B/privileges/revoke",{method:"POST",token:masterToken,body:{privilege:"clinical_privileged_read"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/attendance",{token:otherPrivilegedToken}),{});
 assert.equal(res.status,401);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-B",password:otherPassword},ip:"10.10.0.12"}),{});
 assert.equal(res.status,200);
 const otherTokenAfterPrivileges=(await responseJson(res)).token;

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/disposition`,{method:"POST",token:nurseToken,body:{kind:"ONSITE_INTERVENTION",occurred_at:"not-a-date"}}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_disposition_time");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/disposition`,{method:"POST",token:nurseToken,body:{kind:"ONSITE_INTERVENTION",occurred_at:new Date().toISOString()}}),{});
 assert.equal(res.status,200);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/responses`,{method:"POST",token:nurseToken,body:{text:"Nurse must not author physician response"}}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"response_role_required");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/responses`,{method:"POST",token:physicianToken,body:{text:"Synthetic physician response"}}),{});
 assert.equal(res.status,200);
 const answeredEpisode=await responseJson(res);
 assert.equal(answeredEpisode.status,"RESPONDIDO");
 assert.equal(answeredEpisode.responses.at(-1).author_id,"PHYS-A");
 assert.equal(answeredEpisode.responses.at(-1).late_after_disposition,true);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}`,{token:nurseToken}),{});
 assert.equal(res.status,200);
 const nurseView=await responseJson(res);
 assert.equal(nurseView.status,"RESPONDIDO");
 assert.equal(nurseView.responses.at(-1).text,"Synthetic physician response");
 const lateResponseId=nurseView.responses.at(-1).id;

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/close`,{method:"POST",token:nurseToken,body:{follow_up_pending:false,handoff_required:false,acknowledgement_required:false}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"late_response_review_pending");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/responses/${lateResponseId}/late-review`,{method:"POST",token:physicianToken}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"late_response_self_review_denied");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/responses/${lateResponseId}/late-review`,{method:"POST",token:nurseToken}),{});
 assert.equal(res.status,200);
 const reviewedResponse=await responseJson(res);
 assert.equal(reviewedResponse.late_reviewed_by_id,"NURSE-A");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/close`,{method:"POST",token:nurseToken,body:{follow_up_pending:false,handoff_required:false,acknowledgement_required:false}}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).status,"CERRADO");

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:psychologistToken,body:{patient:{given_name:"Paula",family_name:"Gómez",age_years:36,employee_number:"EMP-PSY-01"},center:"CENTER-A",summary:"Synthetic psychology consultation",level:2}}),{});
 assert.equal(res.status,201);
 const psychologyEpisode=await responseJson(res);
 assert.equal(psychologyEpisode.discipline,"psychology");

 res=await handler(request(`/api/internal-clinical/episodes/${psychologyEpisode.id}/level`,{method:"POST",token:psychologistToken,body:{level:1}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"level_not_applicable");

 res=await handler(request(`/api/internal-clinical/episodes/${psychologyEpisode.id}/responses`,{method:"POST",token:psychologistToken,body:{text:"Synthetic psychology professional response"}}),{});
 assert.equal(res.status,200);
 const psychologyAnswered=await responseJson(res);
 assert.equal(psychologyAnswered.status,"RESPONDIDO");
 assert.equal(psychologyAnswered.responses.at(-1).author_id,"PSY-A");

 res=await handler(request(`/api/internal-clinical/episodes/${psychologyEpisode.id}/close`,{method:"POST",token:psychologistToken,body:{follow_up_pending:false,handoff_required:false,acknowledgement_required:false}}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).status,"CERRADO");

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient:{given_name:"Ana",family_name:"Pérez",age_years:42,employee_number:"EMP-ACK-01"},center:"CENTER-A",summary:"Synthetic acknowledgement flow",level:3}}),{});
 assert.equal(res.status,201);
 const ackEpisode=await responseJson(res);
 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/responses`,{method:"POST",token:physicianToken,body:{text:"Synthetic response requiring acknowledgement"}}),{});
 assert.equal(res.status,200);
 const ackAnswered=await responseJson(res);
 const ackResponseId=ackAnswered.responses.at(-1).id;

 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/close`,{method:"POST",token:nurseToken,body:{follow_up_pending:false,handoff_required:false,acknowledgement_required:true}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"acknowledgement_missing");

 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/responses/${ackResponseId}/delivery`,{method:"POST",token:nurseToken,body:{kind:"read_receipt"}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"invalid_message_transition");

 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/responses/${ackResponseId}/delivery`,{method:"POST",token:nurseToken,body:{kind:"delivery_receipt"}}),{});
 assert.equal(res.status,200);
 const deliveredResponse=await responseJson(res);
 assert.equal(deliveredResponse.status,"ENTREGADA");

 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/close`,{method:"POST",token:nurseToken,body:{follow_up_pending:false,handoff_required:false,acknowledgement_required:true}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"acknowledgement_missing");

 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/responses/${ackResponseId}/delivery`,{method:"POST",token:nurseToken,body:{kind:"read_receipt"}}),{});
 assert.equal(res.status,200);
 const readResponse=await responseJson(res);
 assert.equal(readResponse.status,"LEIDA");

 res=await handler(request(`/api/internal-clinical/episodes/${ackEpisode.id}/close`,{method:"POST",token:nurseToken,body:{follow_up_pending:false,handoff_required:false,acknowledgement_required:true}}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).status,"CERRADO");

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient:{given_name:"Carlos",family_name:"López",age_years:51,employee_number:"EMP-CONT-01"},center:"CENTER-A",summary:"Synthetic delivery contingency",level:3}}),{});
 assert.equal(res.status,201);
 const contingencyEpisode=await responseJson(res);

 res=await handler(request(`/api/internal-clinical/episodes/${contingencyEpisode.id}/delivery`,{method:"POST",token:nurseToken,body:{state:"ALTERNATE_CHANNEL_REQUIRED",reason:"Synthetic premature alternate"}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"alternate_channel_requires_failure");

 res=await handler(request(`/api/internal-clinical/episodes/${contingencyEpisode.id}/delivery`,{method:"POST",token:nurseToken,body:{state:"DELIVERY_FAILED",failure_reason:"Synthetic primary channel unavailable"}}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).delivery.state,"DELIVERY_FAILED");

 res=await handler(request(`/api/internal-clinical/episodes/${contingencyEpisode.id}/delivery`,{method:"POST",token:nurseToken,body:{state:"ALTERNATE_CHANNEL_REQUIRED",reason:"Synthetic alternate required"}}),{});
 assert.equal(res.status,200);
 const alternateDelivery=await responseJson(res);
 assert.equal(alternateDelivery.delivery.state,"ALTERNATE_CHANNEL_REQUIRED");
 const deliveryAudit=await pool.query("SELECT metadata FROM internal_clinical_audit WHERE action='DELIVERY_STATE_CHANGED' ORDER BY seq DESC LIMIT 1");
 assert.equal(deliveryAudit.rows[0].metadata.reason_recorded,true);
 assert.equal("reason" in deliveryAudit.rows[0].metadata,false);

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:otherTokenAfterPrivileges,cookie:workstationCookie}),{});
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

 res=await handler(request("/api/internal-clinical/workstations/WS-A/enrollment-reset",{method:"POST",token:masterToken}),{});
 assert.equal(res.status,200);
 const resetEnrollment=(await responseJson(res)).workstation_enrollment_credential;
 assert.ok(resetEnrollment);
 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:workstationCookie}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"workstation_not_authorized");
 res=await handler(request("/api/internal-clinical/workstations/WS-A/claim",{method:"POST",token:masterToken,body:{enrollment_credential:resetEnrollment}}),{});
 assert.equal(res.status,200);
 const reboundCookie=cookiesFrom(res);

 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:reboundCookie}),{});
 assert.equal(res.status,201);
 const correctedTarget=await responseJson(res);
 res=await handler(request(`/api/internal-clinical/attendance/${correctedTarget.seq}/correct`,{method:"POST",token:masterToken,body:{corrected_event_type:"CLOCK_OUT",corrected_occurred_at:correctedTarget.occurred_at,reason:"Integración: corrección imposible"}}),{});
 assert.equal(res.status,409);
 assert.equal((await responseJson(res)).detail,"attendance_correction_breaks_sequence");

 res=await handler(request(`/api/internal-clinical/attendance/${correctedTarget.seq}/correct`,{method:"POST",token:masterToken,body:{corrected_event_type:"CLOCK_IN",corrected_occurred_at:correctedTarget.occurred_at,reason:"Integración: corrección válida"}}),{});
 assert.equal(res.status,201);

 res=await handler(request("/api/internal-clinical/attendance/clock-out",{method:"POST",token:nurseToken,cookie:reboundCookie}),{});
 assert.equal(res.status,201);
 res=await handler(request("/api/internal-clinical/attendance/clock-in",{method:"POST",token:nurseToken,cookie:reboundCookie}),{});
 assert.equal(res.status,201);
 res=await handler(request("/api/internal-clinical/attendance/clock-out",{method:"POST",token:nurseToken,cookie:reboundCookie}),{});
 assert.equal(res.status,201);

 res=await handler(request("/api/internal-clinical/attendance",{token:otherTokenAfterPrivileges}),{});
 assert.equal(res.status,200);
 assert.deepEqual(await responseJson(res),[]);

 res=await handler(request("/api/internal-clinical/attendance?limit=2",{token:nurseToken}),{});
 assert.equal(res.status,200);
 const attendancePageOne=await responseJson(res);
 assert.equal(attendancePageOne.length,2);
 const attendanceCursor=Math.min(...attendancePageOne.map(x=>Number(x.seq)));
 res=await handler(request(`/api/internal-clinical/attendance?limit=2&before_seq=${attendanceCursor}`,{token:nurseToken}),{});
 assert.equal(res.status,200);
 const attendancePageTwo=await responseJson(res);
 assert.ok(attendancePageTwo.every(x=>Number(x.seq)<attendanceCursor));
 assert.equal(attendancePageTwo.some(x=>attendancePageOne.some(y=>Number(y.seq)===Number(x.seq))),false);
 res=await handler(request("/api/internal-clinical/attendance?before_seq=bad",{token:nurseToken}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_before_seq");

 res=await handler(request("/api/internal-clinical/audit?limit=2",{token:masterToken}),{});
 assert.equal(res.status,200);
 const auditPageOne=await responseJson(res);
 assert.equal(auditPageOne.length,2);
 const auditCursor=Math.min(...auditPageOne.map(x=>Number(x.seq)));
 res=await handler(request(`/api/internal-clinical/audit?limit=2&before_seq=${auditCursor}`,{token:masterToken}),{});
 assert.equal(res.status,200);
 const auditPageTwo=await responseJson(res);
 assert.ok(auditPageTwo.every(x=>Number(x.seq)<auditCursor));
 assert.equal(auditPageTwo.some(x=>auditPageOne.some(y=>Number(y.seq)===Number(x.seq))),false);
 res=await handler(request("/api/internal-clinical/audit?before_seq=bad",{token:masterToken}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_before_seq");

 res=await handler(request("/api/internal-clinical/recovery/snapshot",{token:masterToken}),{});
 assert.equal(res.status,200);
 const snapshot=await responseJson(res);
 assert.equal(snapshot.schema_version,5);
 assert.ok(snapshot.patients.some(x=>x.id===episode.patient_id));
 assert.ok(snapshot.workstations.find(x=>x.id==="WS-A")?.claimed_at);
 assert.ok(snapshot.attendance.length>=5);
 assert.equal(snapshot.contingency.length,1);
 assert.equal(snapshot.contingency[0].tenant_id,"GASI-LEGACY");
 assert.equal(snapshot.contingency[0].center,"CENTER-A");

 const beforeTamper=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;

 const unsignedEdit=structuredClone(snapshot);
 unsignedEdit.workers.find(x=>x.id==="NURSE-A").display_name="Tampered Name";
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:unsignedEdit}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_snapshot_signature");
 const afterUnsignedEdit=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterUnsignedEdit,beforeTamper);

 const tampered=structuredClone(snapshot);
 tampered.audit[0].event_hash="0".repeat(64);
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:tampered}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_snapshot");
 const afterTamper=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterTamper,beforeTamper);

 const duplicateWorker=structuredClone(snapshot);
 duplicateWorker.workers.push(structuredClone(duplicateWorker.workers[0]));
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:duplicateWorker}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_snapshot_references");
 const afterDuplicate=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterDuplicate,beforeTamper);

 const invalidAttendance=structuredClone(snapshot);
 const firstOriginal=invalidAttendance.attendance.find(x=>x.event_type==="CLOCK_IN");
 firstOriginal.event_type="CLOCK_OUT";
 resignSnapshot(invalidAttendance,secrets.GASI_RECOVERY_SIGNING_SECRET);
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:invalidAttendance}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_attendance_semantics");
 const afterInvalidAttendance=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterInvalidAttendance,beforeTamper);

 const noProvenance=structuredClone(snapshot);
 noProvenance.audit=[];
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:noProvenance}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_snapshot_provenance");
 const afterNoProvenance=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterNoProvenance,beforeTamper);

 const noMaster=structuredClone(snapshot);
 noMaster.workers=noMaster.workers.filter(x=>x.id!=="GASI-MASTER-01");
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:noMaster}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_snapshot_master");
 const afterNoMaster=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterNoMaster,beforeTamper);

 const currentMasterPassword=syntheticSecret();
 res=await handler(request("/api/internal-clinical/password",{method:"POST",token:masterToken,body:{current_password:recoveredMasterPassword,new_password:currentMasterPassword}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:currentMasterPassword},ip:"10.10.0.30"}),{});
 assert.equal(res.status,200);
 masterToken=(await responseJson(res)).token;

 await pool.query("UPDATE internal_center_workstations SET claimed_at=NULL WHERE id='WS-A'");
 await pool.query("UPDATE internal_contingency_channels SET target='+34919999999' WHERE tenant_id='GASI-LEGACY' AND center='CENTER-A'");
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:snapshot}),{});
 assert.equal(res.status,200);
 const restorePayload=await responseJson(res);
 assert.equal(restorePayload.master_reauthentication_required,true);
 const restored=await pool.query("SELECT claimed_at,active FROM internal_center_workstations WHERE id='WS-A'");
 assert.ok(restored.rows[0].claimed_at);
 assert.equal(restored.rows[0].active,true);
 const restoredContingency=(await pool.query("SELECT target,active FROM internal_contingency_channels WHERE tenant_id='GASI-LEGACY' AND center='CENTER-A'")).rows[0];
 assert.equal(restoredContingency.target,"+34910000001");
 assert.equal(restoredContingency.active,true);
 const restoredPatient=(await pool.query("SELECT id,medical_record_number,dni,employee_number FROM internal_clinical_patients WHERE id=$1",[episode.patient_id])).rows[0];
 assert.equal(restoredPatient.id,episode.patient_id);
 assert.equal(restoredPatient.medical_record_number,episode.patient_ref);
 assert.equal(restoredPatient.dni,"12345678Z");
 const restoredEpisodesForPatient=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_clinical_episodes WHERE patient_id=$1",[episode.patient_id])).rows[0].n;
 assert.ok(restoredEpisodesForPatient>=2);

 res=await handler(request("/api/internal-clinical/session",{token:masterToken}),{});
 assert.equal(res.status,401);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:secrets.GASI_MASTER_PASSWORD},ip:"10.10.0.31"}),{});
 assert.equal(res.status,401);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:currentMasterPassword},ip:"10.10.0.32"}),{});
 assert.equal(res.status,200);
 masterToken=(await responseJson(res)).token;

 res=await handler(request("/api/internal-clinical/attendance",{token:nurseToken}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"session_expired_or_revoked");

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-A",password:nursePassword},ip:"10.10.0.11"}),{});
 assert.equal(res.status,200);
 const nurseAfterRestoreToken=(await responseJson(res)).token;
 res=await handler(request("/api/internal-clinical/attendance",{token:nurseAfterRestoreToken}),{});
 assert.equal(res.status,200);

 res=await handler(request("/api/internal-clinical/workers/NURSE-A/privileges/grant",{method:"POST",token:masterToken,body:{privilege:"worker_access_management"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/attendance",{token:nurseAfterRestoreToken}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-A",password:nursePassword},ip:"10.10.0.11"}),{});
 assert.equal(res.status,200);
 const combinedNurseToken=(await responseJson(res)).token;

 res=await handler(request("/api/internal-clinical/workers",{token:combinedNurseToken}),{});
 assert.equal(res.status,200);
 const delegatedWorkers=await responseJson(res);
 assert.ok(delegatedWorkers.some(x=>x.id==="NURSE-A"));
 assert.equal(delegatedWorkers.some(x=>x.id==="ADMIN-A"),false);
 assert.equal(delegatedWorkers.some(x=>x.id==="NURSE-B"),false);

 res=await handler(request("/api/internal-clinical/workers/NURSE-B/access",{method:"POST",token:combinedNurseToken,body:{state:"REVOKED"}}),{});
 assert.equal(res.status,404);
 assert.equal((await responseJson(res)).detail,"worker_not_visible");

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}`,{token:combinedNurseToken}),{});
 assert.equal(res.status,200);
 assert.equal((await responseJson(res)).discipline,"nursing");

 res=await handler(request("/api/internal-clinical/attendance",{token:combinedNurseToken}),{});
 assert.equal(res.status,200);
 assert.ok((await responseJson(res)).length>0);

 res=await handler(request("/api/internal-clinical/workers/NURSE-A/privileges/revoke",{method:"POST",token:masterToken,body:{privilege:"worker_access_management"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/workers",{token:combinedNurseToken}),{});
 assert.equal(res.status,401);

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-A",password:nursePassword},ip:"10.10.0.11"}),{});
 assert.equal(res.status,200);
 const nurseAfterDelegationToken=(await responseJson(res)).token;
 res=await handler(request("/api/internal-clinical/workers",{token:nurseAfterDelegationToken}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"worker_management_required");

 res=await handler(request("/api/internal-clinical/workers/NURSE-A/access",{method:"POST",token:masterToken,body:{state:"REVOKED"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/attendance",{token:nurseAfterDelegationToken}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"session_expired_or_revoked");

 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-A",password:nursePassword},ip:"10.10.0.41"}),{});
 assert.equal(res.status,401);
 assert.equal((await responseJson(res)).detail,"invalid_credentials");

 res=await handler(request("/api/internal-clinical/workers/NURSE-A/access",{method:"POST",token:masterToken,body:{state:"ACTIVE"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"NURSE-A",password:nursePassword},ip:"10.10.0.42"}),{});
 assert.equal(res.status,200);
 const reactivatedNurseToken=(await responseJson(res)).token;
 res=await handler(request("/api/internal-clinical/session",{token:reactivatedNurseToken}),{});
 assert.equal(res.status,200);

 await assert.rejects(()=>pool.query("UPDATE internal_attendance_events SET center='CENTER-X' WHERE seq=$1",[firstClockIn.seq]),/append-only/);
 await assert.rejects(()=>pool.query("DELETE FROM internal_attendance_events WHERE seq=$1",[firstClockIn.seq]),/append-only/);
 const auditSeq=(await pool.query("SELECT seq FROM internal_clinical_audit ORDER BY seq LIMIT 1")).rows[0].seq;
 await assert.rejects(()=>pool.query("UPDATE internal_clinical_audit SET action='TAMPERED' WHERE seq=$1",[auditSeq]),/append-only/);
 await assert.rejects(()=>pool.query("DELETE FROM internal_clinical_audit WHERE seq=$1",[auditSeq]),/append-only/);

 const workingDbUrl=secrets.NETLIFY_DB_URL;
 {const broken=new URL(workingDbUrl);broken.port="1";secrets.NETLIFY_DB_URL=broken.toString();}
 res=await handler(request("/api/internal-clinical/health"),{});
 assert.equal(res.status,500);
 assert.deepEqual(await responseJson(res),{detail:"internal_error"});
 assert.match(res.headers.get("x-request-id")||"",/^[0-9a-f-]{36}$/i);
 assert.match(res.headers.get("server-timing")||"",/^app;dur=\d+$/);
 assert.equal(res.headers.get("content-type"),"application/json");
 secrets.NETLIFY_DB_URL=workingDbUrl;

 await pool.end();
});
