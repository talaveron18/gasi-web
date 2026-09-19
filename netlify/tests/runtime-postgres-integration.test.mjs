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
 const physicianPassword="PhysicianIntegrationPassword!123";
 const adminPassword="AdminIntegrationPassword!123";
 const nurseHash=await bcrypt.hash(nursePassword,12);
 const otherHash=await bcrypt.hash(otherPassword,12);
 const physicianHash=await bcrypt.hash(physicianPassword,12);
 const adminHash=await bcrypt.hash(adminPassword,12);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'nurse',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["NURSE-A","Nurse A",JSON.stringify(["CENTER-A"]),nurseHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'nurse',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["NURSE-B","Nurse B",JSON.stringify(["CENTER-B"]),otherHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'physician',$2,$3::jsonb,TRUE,1,'[]'::jsonb,$4)",["PHYS-A","Physician A",JSON.stringify(["CENTER-A"]),physicianHash]);
 await pool.query("INSERT INTO internal_clinical_workers(id,role,display_name,centers,active,auth_version,delegated_privileges,password_hash) VALUES($1,'admin',$2,'[]'::jsonb,TRUE,1,'[]'::jsonb,$3)",["ADMIN-A","Admin A",adminHash]);

 let res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"GASI-MASTER-01",password:secrets.GASI_MASTER_PASSWORD}}),{});
 assert.equal(res.status,200);
 const masterLogin=await responseJson(res);
 const masterToken=masterLogin.token;
 assert.ok(masterToken);

 const tempPassword="TemporaryWorkerPassword!123";
 const permanentPassword="PermanentWorkerPassword!456";
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

 for(let i=0;i<8;i++){
  res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"UNKNOWN-RATE-LIMIT",password:"wrong"},ip:"10.10.0.99"}),{});
  assert.equal(res.status,401);
 }
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"UNKNOWN-RATE-LIMIT",password:"wrong"},ip:"10.10.0.99"}),{});
 assert.equal(res.status,429);
 res=await handler(request("/api/internal-clinical/login",{method:"POST",body:{worker_id:"UNKNOWN-RATE-LIMIT",password:"wrong"},ip:"10.10.0.100"}),{});
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

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient_ref:"SYNTH-PAT-01",center:"CENTER-A",summary:"Synthetic nursing escalation",level:2}}),{});
 assert.equal(res.status,201);
 const episode=await responseJson(res);
 assert.equal(episode.status,"ABIERTO");
 assert.equal(episode.discipline,"nursing");

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
 assert.ok((await responseJson(res)).some(x=>x.id===episode.id&&x.status==="ABIERTO"));

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

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/disposition`,{method:"POST",token:nurseToken,body:{kind:"ONSITE_INTERVENTION",occurred_at:new Date().toISOString()}}),{});
 assert.equal(res.status,200);

 res=await handler(request(`/api/internal-clinical/episodes/${episode.id}/responses`,{method:"POST",token:nurseToken,body:{text:"Nurse must not author physician response"}}),{});
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"physician_only");

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

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient_ref:"SYNTH-PAT-ACK",center:"CENTER-A",summary:"Synthetic acknowledgement flow",level:3}}),{});
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

 res=await handler(request("/api/internal-clinical/episodes",{method:"POST",token:nurseToken,body:{patient_ref:"SYNTH-PAT-CONT",center:"CENTER-A",summary:"Synthetic delivery contingency",level:3}}),{});
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

 res=await handler(request("/api/internal-clinical/recovery/snapshot",{token:masterToken}),{});
 assert.equal(res.status,200);
 const snapshot=await responseJson(res);
 assert.equal(snapshot.schema_version,2);
 assert.ok(snapshot.workstations.find(x=>x.id==="WS-A")?.claimed_at);
 assert.ok(snapshot.attendance.length>=5);

 const beforeTamper=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
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

 const noMaster=structuredClone(snapshot);
 noMaster.workers=noMaster.workers.filter(x=>x.id!=="GASI-MASTER-01");
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:noMaster}),{});
 assert.equal(res.status,422);
 assert.equal((await responseJson(res)).detail,"invalid_recovery_snapshot_master");
 const afterNoMaster=(await pool.query("SELECT COUNT(*)::int AS n FROM internal_attendance_events")).rows[0].n;
 assert.equal(afterNoMaster,beforeTamper);

 await pool.query("UPDATE internal_center_workstations SET claimed_at=NULL WHERE id='WS-A'");
 res=await handler(request("/api/internal-clinical/recovery/restore",{method:"POST",token:masterToken,body:snapshot}),{});
 assert.equal(res.status,200);
 const restored=await pool.query("SELECT claimed_at,active FROM internal_center_workstations WHERE id='WS-A'");
 assert.ok(restored.rows[0].claimed_at);
 assert.equal(restored.rows[0].active,true);

 res=await handler(request("/api/internal-clinical/workers/NURSE-A/privileges/grant",{method:"POST",token:masterToken,body:{privilege:"worker_access_management"}}),{});
 assert.equal(res.status,200);
 res=await handler(request("/api/internal-clinical/attendance",{token:nurseToken}),{});
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
 assert.equal(res.status,403);
 assert.equal((await responseJson(res)).detail,"worker_center_management_denied");

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

 await assert.rejects(()=>pool.query("UPDATE internal_attendance_events SET center='CENTER-X' WHERE seq=$1",[firstClockIn.seq]),/append-only/);
 await assert.rejects(()=>pool.query("DELETE FROM internal_attendance_events WHERE seq=$1",[firstClockIn.seq]),/append-only/);
 const auditSeq=(await pool.query("SELECT seq FROM internal_clinical_audit ORDER BY seq LIMIT 1")).rows[0].seq;
 await assert.rejects(()=>pool.query("UPDATE internal_clinical_audit SET action='TAMPERED' WHERE seq=$1",[auditSeq]),/append-only/);
 await assert.rejects(()=>pool.query("DELETE FROM internal_clinical_audit WHERE seq=$1",[auditSeq]),/append-only/);

 const workingDbUrl=secrets.NETLIFY_DB_URL;
 secrets.NETLIFY_DB_URL="postgresql://postgres:postgres@127.0.0.1:1/gasi";
 res=await handler(request("/api/internal-clinical/health"),{});
 assert.equal(res.status,500);
 assert.deepEqual(await responseJson(res),{detail:"internal_error"});
 secrets.NETLIFY_DB_URL=workingDbUrl;

 await pool.end();
});
