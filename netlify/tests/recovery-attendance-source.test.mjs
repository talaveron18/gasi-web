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
