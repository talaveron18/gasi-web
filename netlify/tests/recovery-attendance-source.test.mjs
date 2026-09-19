import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
test("recovery v2 snapshots attendance and workstation state",()=>{
 assert.match(source,/schema_version:2,episodes,workers,audit:auditRows,counters,workstations,attendance/);
 assert.match(source,/SELECT id,center,label,credential_hash,active,created_at,revoked_at FROM internal_center_workstations/);
 assert.match(source,/SELECT seq,worker_id,center,workstation_id,event_type,occurred_at,related_event_seq,reason,actor_id,metadata FROM internal_attendance_events/);
});
test("restore clears FK dependents first and restores immutable attendance",()=>{
 const a=source.indexOf('DELETE FROM internal_attendance_events'), w=source.indexOf('DELETE FROM internal_clinical_workers');
 assert.ok(a>=0&&w>a);
 assert.match(source,/INSERT INTO internal_center_workstations/);
 assert.match(source,/INSERT INTO internal_attendance_events/);
 assert.match(source,/pg_get_serial_sequence\('internal_attendance_events','seq'\)/);
});

test("restore validates every v2 collection before opening the restore transaction",()=>{
 const validation=source.indexOf('snapshot.workstations.some');
 const restore=source.indexOf('path==="/api/internal-clinical/recovery/restore"');
 const connect=source.indexOf('const client=await db.pool.connect()',restore);
 assert.ok(validation>=0&&connect>validation);
 assert.match(source,/snapshot\.attendance\.some\(\(x:any\)=>.*CLOCK_IN.*CLOCK_OUT.*CORRECTION/);
 assert.match(source,/snapshot\.audit\.some/);
 assert.match(source,/snapshot\.counters\.some/);
});

test("restore order satisfies attendance foreign keys",()=>{
 const workers=source.indexOf('INSERT INTO internal_clinical_workers');
 const workstations=source.indexOf('INSERT INTO internal_center_workstations');
 const attendance=source.indexOf('INSERT INTO internal_attendance_events');
 assert.ok(workers>=0&&workstations>workers&&attendance>workstations);
});

test("restore rejects broken attendance references before destructive work",()=>{
 const validation=source.indexOf('invalid_recovery_snapshot_references');
 const connect=source.indexOf('const client=await db.pool.connect()',source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.ok(validation>=0&&connect>validation);
 assert.match(source,/workerIds\.has\(String\(x\.worker_id\)\)/);
 assert.match(source,/workstationCenters\.get\(String\(x\.workstation_id\)\)!==String\(x\.center\)/);
 assert.match(source,/related_event_seq!=null&&!attendanceSeqs\.has\(Number\(x\.related_event_seq\)\)/);
});

test("attendance correction records corrected values and preserves the original event",()=>{
 const route=source.indexOf('attendanceCorrection=path.match');
 const end=source.indexOf('const attendance=path.match',route);
 const correction=source.slice(route,end);
 assert.match(correction,/corrected_occurred_at/);
 assert.match(correction,/corrected_event_type/);
 assert.match(correction,/original_event_type/);
 assert.match(correction,/original_occurred_at/);
 assert.doesNotMatch(correction,/UPDATE internal_attendance_events/);
});
