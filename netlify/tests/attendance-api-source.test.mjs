import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("attendance requires authenticated professional and registered active workstation",()=>{
 assert.ok(source.includes('attendance\\/(clock-in|clock-out)'),"attendance route matcher missing");
 assert.match(source,/w\.role==="admin".*professional_role_required/);
 assert.match(source,/internal_center_workstations WHERE id=/);
 assert.match(source,/!ws\|\|!ws\.active\|\|!\(await verifyPassword\(credential,ws\.credential_hash\)\)/);
});
test("workstation center must belong to worker",()=>{
 assert.match(source,/!Array\.isArray\(w\.centers\)\|\|!w\.centers\.includes\(ws\.center\)/);
 assert.match(source,/workstation_center_denied/);
});
test("open shift state is deterministic",()=>{
 assert.match(source,/shift_already_open/);
 assert.match(source,/no_open_shift/);
 assert.match(source,/eventType==="CLOCK_IN"&&last\?\.event_type==="CLOCK_IN"/);
 assert.match(source,/eventType==="CLOCK_OUT"&&last\?\.event_type!=="CLOCK_IN"/);
});
test("attendance timestamp is database generated and event is audited",()=>{
 assert.match(source,/INSERT INTO internal_attendance_events\(worker_id,center,workstation_id,event_type,actor_id\)/);
 assert.doesNotMatch(source,/internal_attendance_events[^\n]*occurred_at[^\n]*VALUES/);
 assert.match(source,/ATTENDANCE_CLOCKED_IN/);
 assert.match(source,/ATTENDANCE_CLOCKED_OUT/);
});

test("only master can enroll or change workstation state and raw credential is never persisted",()=>{
 assert.match(source,/path==="\/api\/internal-clinical\/workstations".*w\.id!==MASTER\(\).*master_account_only/);
 assert.match(source,/bcrypt\.hash\(credential,12\)/);
 assert.match(source,/INSERT INTO internal_center_workstations\(id,center,label,credential_hash,active\)/);
 assert.doesNotMatch(source,/INSERT INTO internal_center_workstations[^\n]*credential,active/);
 assert.match(source,/WORKSTATION_REGISTERED/);
 assert.match(source,/WORKSTATION_REVOKED/);
});

test("attendance corrections are separate privileged audited events",()=>{
 assert.match(source,/attendance\\\/\(\[\^\/\]\+\)\\\/correct/);
 assert.match(source,/worker_access_management/);
 assert.match(source,/event_type,related_event_seq,reason,actor_id,metadata\) VALUES/);
 assert.match(source,/'CORRECTION'/);
 assert.match(source,/ATTENDANCE_CORRECTION_RECORDED/);
 assert.doesNotMatch(source,/UPDATE internal_attendance_events/);
 assert.doesNotMatch(source,/DELETE FROM internal_attendance_events/);
});

test("attendance history prevents horizontal worker access",()=>{
 assert.match(source,/path==="\/api\/internal-clinical\/attendance"/);
 assert.match(source,/w\.role==="admin".*worker_access_management/);
 assert.match(source,/internal_attendance_events WHERE worker_id=\$\{w\.id\}/);
 assert.doesNotMatch(source,/url\.searchParams\.get\("worker_id"\)/);
});
