import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("attendance requires authenticated professional and registered active workstation",()=>{
 assert.match(source,/attendance\\\/(clock-in\|clock-out)/);
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
