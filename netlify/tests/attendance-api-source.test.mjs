import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("attendance requires authenticated professional and claimed active workstation browser",()=>{
 assert.ok(source.includes('attendance\\/(clock-in|clock-out)'),"attendance route matcher missing");
 assert.match(source,/w\.role==="admin".*professional_role_required/);
 assert.match(source,/cookieValue\(req,"gasi_ws_id"\)/);
 assert.match(source,/cookieValue\(req,"gasi_ws_secret"\)/);
 assert.match(source,/internal_center_workstations WHERE id=/);
 assert.match(source,/!ws\|\|!ws\.active\|\|!ws\.claimed_at/);
 assert.match(source,/verifyPassword\(deviceSecret,ws\.credential_hash\)/);
});
test("workstation center must belong to worker",()=>{
 assert.match(source,/!Array\.isArray\(w\.centers\)\|\|!w\.centers\.includes\(ws\.center\)/);
 assert.match(source,/workstation_center_denied/);
});
test("open shift state is deterministic",()=>{
 assert.match(source,/shift_already_open/);
 assert.match(source,/no_open_shift/);
 assert.match(source,/lastEffectiveType=last\?\.corrected_event_type\|\|last\?\.event_type/);
 assert.match(source,/eventType==="CLOCK_IN"&&lastEffectiveType==="CLOCK_IN"/);
 assert.match(source,/eventType==="CLOCK_OUT"&&lastEffectiveType!=="CLOCK_IN"/);
});
test("attendance timestamp is database generated and event is audited",()=>{
 assert.match(source,/INSERT INTO internal_attendance_events\(worker_id,center,workstation_id,event_type,actor_id\)/);
 const attendanceRoute=source.slice(source.indexOf("const attendance=path.match"),source.indexOf('if(req.method==="GET"&&path==="/api/internal-clinical/workers"'));
 assert.ok(!attendanceRoute.includes("occurred_at) VALUES"),"attendance insert must use database timestamp");
 assert.match(source,/ATTENDANCE_CLOCKED_IN/);
 assert.match(source,/ATTENDANCE_CLOCKED_OUT/);
});

test("only master can enroll, claim, reset or change workstation state",()=>{
 assert.match(source,/path==="\/api\/internal-clinical\/workstations".*w\.id!==MASTER\(\).*master_account_only/);
 assert.match(source,/workstationClaim.*w\.id!==MASTER\(\).*master_account_only/);
 assert.match(source,/workstationReset.*w\.id!==MASTER\(\).*master_account_only/);
 assert.match(source,/WORKSTATION_REGISTERED/);
 assert.match(source,/WORKSTATION_CLAIMED/);
 assert.match(source,/WORKSTATION_ENROLLMENT_RESET/);
 assert.match(source,/WORKSTATION_REVOKED/);
});

test("workstation enrollment becomes a HttpOnly fixed-browser credential",()=>{
 assert.match(source,/crypto\.randomBytes\(32\)\.toString\("base64url"\)/);
 assert.match(source,/bcrypt\.hash\(deviceSecret,12\)/);
 assert.match(source,/claimed_at=NOW\(\)/);
 assert.match(source,/HttpOnly; Secure; SameSite=Strict/);
 assert.match(source,/Path=\/api\/internal-clinical\/attendance/);
 assert.match(source,/gasi_ws_id=/);
 assert.match(source,/gasi_ws_secret=/);
 assert.match(source,/mobile_workstation_claim_denied/);
});

test("attendance corrections are separate privileged audited events",()=>{
 assert.match(source,/attendance\\\/\(\[\^\/\]\+\)\\\/correct/);
 assert.match(source,/event_type,related_event_seq,reason,actor_id,metadata\) VALUES/);
 assert.match(source,/'CORRECTION'/);
 assert.match(source,/ATTENDANCE_CORRECTION_RECORDED/);
 const correctionStart=source.indexOf("const attendanceCorrection=path.match");
 const correctionRoute=source.slice(correctionStart,correctionStart+7600);
 assert.doesNotMatch(correctionRoute,/UPDATE internal_attendance_events/);
 assert.doesNotMatch(correctionRoute,/DELETE FROM internal_attendance_events/);
 assert.match(correctionRoute,/original_event_type:original\.event_type/);
 assert.match(correctionRoute,/original_occurred_at:original\.occurred_at/);
 assert.match(correctionRoute,/corrected_event_type:correctedEventType/);
 assert.match(correctionRoute,/corrected_occurred_at:normalizedCorrectedAt/);
});

test("attendance history prevents horizontal worker access",()=>{
 assert.match(source,/path==="\/api\/internal-clinical\/attendance"/);
 assert.match(source,/w\.role==="admin".*w\.id!==MASTER\(\).*attendance_global_read_denied/);
 assert.match(source,/internal_attendance_events WHERE worker_id=\$\{w\.id\}/);
 assert.doesNotMatch(source,/url\.searchParams\.get\("worker_id"\)/);
});

test("attendance state transition is serialized per worker",()=>{
 const attendanceStart=source.indexOf("const attendance=path.match");
 const attendanceRoute=source.slice(attendanceStart,attendanceStart+5200);
 assert.match(attendanceRoute,/db\.pool\.connect\(\)/);
 assert.match(attendanceRoute,/client\.query\("BEGIN"\)/);
 assert.match(attendanceRoute,/pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
 const lockAt=attendanceRoute.indexOf("pg_advisory_xact_lock"),stateAt=attendanceRoute.indexOf("SELECT e.seq,e.event_type,e.occurred_at"),insertAt=attendanceRoute.indexOf("INSERT INTO internal_attendance_events");
 assert.ok(lockAt>=0&&stateAt>lockAt&&insertAt>stateAt,"lock must precede state check and insert");
 assert.match(attendanceRoute,/client\.query\("COMMIT"\)/);
 assert.match(attendanceRoute,/client\.query\("ROLLBACK"\)/);
 assert.match(attendanceRoute,/client\.release\(\)/);
});

test("ordinary administrators cannot read or correct global attendance",()=>{
 const history=source.slice(source.indexOf('if(req.method==="GET"&&path==="/api/internal-clinical/attendance")'),source.indexOf("const attendanceCorrection=path.match"));
 assert.match(history,/w\.role==="admin"/);
 assert.match(history,/w\.id!==MASTER\(\).*attendance_global_read_denied/);
 assert.match(history,/ATTENDANCE_GLOBAL_VIEWED/);
 const correction=source.slice(source.indexOf("const attendanceCorrection=path.match"),source.indexOf("const attendance=path.match"));
 assert.match(correction,/w\.id!==MASTER\(\).*attendance_correction_denied/);
});

test("workstation inventory is master-only and never returns credential hash",()=>{
 const start=source.indexOf('if(req.method==="GET"&&path==="/api/internal-clinical/workstations")');
 const route=source.slice(start,start+800);
 assert.match(route,/w\.id!==MASTER\(\).*master_account_only/);
 assert.match(route,/SELECT id,center,label,active,created_at,revoked_at,claimed_at FROM internal_center_workstations/);
 assert.doesNotMatch(route,/SELECT[^`]*credential_hash/);
});

test("attendance correction cannot target another correction event",()=>{
 const start=source.indexOf("const attendanceCorrection=path.match");
 const route=source.slice(start,start+2600);
 assert.match(route,/!\["CLOCK_IN","CLOCK_OUT"\]\.includes\(String\(original\.event_type\)\).*attendance_correction_target_invalid/);
});


test("shift state uses the latest correction of the last original attendance event",()=>{
 const start=source.indexOf("const attendance=path.match");
 const route=source.slice(start,start+5200);
 assert.match(route,/metadata->>'corrected_event_type'/);
 assert.match(route,/c\.related_event_seq=e\.seq ORDER BY c\.seq DESC LIMIT 1/);
 assert.match(route,/lastEffectiveType=last\?\.corrected_event_type\|\|last\?\.event_type/);
});


test("workstation one-time claim is serialized per workstation",()=>{
 const start=source.indexOf("const workstationClaim=path.match");
 assert.ok(start>=0,"workstation claim route missing");
 const route=source.slice(start,start+3600);
 assert.match(route,/db\.pool\.connect\(\)/);
 assert.match(route,/client\.query\("BEGIN"\)/);
 assert.match(route,/pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
 assert.match(route,/workstation:\$\{id\}/);
 assert.match(route,/FOR UPDATE/);
 assert.match(route,/client\.query\("COMMIT"\)/);
 assert.match(route,/client\.query\("ROLLBACK"\)/);
 assert.match(route,/client\.release\(\)/);
});


test("attendance corrections preserve a valid alternating timeline and serialize with clock events",()=>{
 const start=source.indexOf("const attendanceCorrection=path.match");
 const route=source.slice(start,start+6200);
 assert.match(route,/pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
 assert.match(route,/corrected_occurred_at/);
 assert.match(route,/ORDER BY e\.seq/);
 assert.match(route,/expected=i%2===0\?"CLOCK_IN":"CLOCK_OUT"/);
 assert.match(route,/attendance_correction_breaks_sequence/);
 assert.match(route,/attendance_correction_breaks_timeline/);
});


test("attendance corrections reject future effective timestamps",()=>{
 const start=source.indexOf("const attendanceCorrection=path.match");
 const route=source.slice(start,start+6800);
 assert.match(route,/correctedMillis>Date\.now\(\)/);
 assert.match(route,/attendance_correction_future_time/);
});


test("workstation registration serializes on center and rejects duplicates",()=>{
 const start=source.indexOf('if(req.method==="POST"&&path==="/api/internal-clinical/workstations")');
 assert.ok(start>=0);
 const route=source.slice(start,start+3000);
 assert.match(route,/workstation-center:\$\{center\}/);
 assert.match(route,/workstation:\$\{id\}/);
 assert.match(route,/WHERE id=\$1 OR center=\$2 LIMIT 1/);
 assert.match(route,/workstation_center_already_registered/);
});
