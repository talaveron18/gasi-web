import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
test("recovery v2 snapshots attendance and workstation state",()=>{
 assert.match(source,/schema_version:2,episodes,workers,audit:auditRows,counters,workstations,attendance/);
 assert.match(source,/SELECT id,center,label,credential_hash,active,created_at,revoked_at,claimed_at,network_fingerprint_hash FROM internal_center_workstations/);
 assert.match(source,/SELECT seq,worker_id,center,workstation_id,event_type,occurred_at,related_event_seq,reason,actor_id,metadata FROM internal_attendance_events/);
});
test("restore clears FK dependents first and restores immutable attendance",()=>{
 const a=source.indexOf('TRUNCATE TABLE internal_attendance_events RESTART IDENTITY'), w=source.indexOf('DELETE FROM internal_clinical_workers');
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
 assert.match(source,/related_event_seq!=null&&\(!attendanceSeqs\.has\(Number\(x\.related_event_seq\)\)\|\|Number\(x\.related_event_seq\)>=Number\(x\.seq\)\)/);
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


test("restore sorts attendance by sequence before inserting self-references",()=>{
 assert.match(source,/\[\.\.\.snapshot\.attendance\]\.sort\(\(a:any,b:any\)=>Number\(a\.seq\)-Number\(b\.seq\)\)/);
});


test("recovery preserves workstation browser binding state",()=>{
 assert.match(source,/SELECT id,center,label,credential_hash,active,created_at,revoked_at,claimed_at,network_fingerprint_hash FROM internal_center_workstations/);
 assert.match(source,/INSERT INTO internal_center_workstations\\(id,center,label,credential_hash,active,created_at,revoked_at,claimed_at,network_fingerprint_hash\\)/);
 assert.match(source,/x\.claimed_at/);
});


test("restore bypasses the ordinary delete trigger only through transactional truncate",()=>{
 assert.match(source,/TRUNCATE TABLE internal_attendance_events RESTART IDENTITY/);
 const restore=source.slice(source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.doesNotMatch(restore,/DELETE FROM internal_attendance_events/);
 assert.match(restore,/client\.query\("BEGIN"\)/);
 assert.match(restore,/client\.query\("COMMIT"\)/);
 assert.match(restore,/client\.query\("ROLLBACK"\)/);
});


test("restore explicitly serializes JSONB payloads for node-postgres",()=>{
 assert.match(source,/JSON\.stringify\(x\.document\)/);
 assert.match(source,/JSON\.stringify\(x\.centers\)/);
 assert.match(source,/JSON\.stringify\(x\.delegated_privileges\)/);
 assert.match(source,/JSON\.stringify\(x\.metadata\)/);
});


test("restore verifies the audit hash chain before destructive work",()=>{
 assert.match(source,/function validAuditSnapshot\(rows:any\[\]\)/);
 assert.match(source,/previous="0"\.repeat\(64\)/);
 assert.match(source,/String\(x\.previous_hash\|\|""\)!==previous/);
 assert.match(source,/crypto\.createHash\("sha256"\)\.update\(previous\+":"\+canonical\(payload\)\)\.digest\("hex"\)/);
 assert.match(source,/!validAuditSnapshot\(snapshot\.audit\)/);
 const validation=source.indexOf("!validAuditSnapshot(snapshot.audit)");
 const connect=source.indexOf("const client=await db.pool.connect()",source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.ok(validation>=0&&connect>validation);
});


test("recovery export and successful restore are audited",()=>{
 assert.match(source,/RECOVERY_SNAPSHOT_EXPORTED/);
 assert.match(source,/RECOVERY_RESTORED/);
 assert.match(source,/episode_count:restored\.episodes/);
 assert.match(source,/worker_count:restored\.workers/);
 assert.match(source,/attendance_count:restored\.attendance/);
});


test("restore rejects duplicate ids and sequence keys before destructive work",()=>{
 assert.match(source,/episodeIds\.size!==snapshot\.episodes\.length/);
 assert.match(source,/workerIds\.size!==snapshot\.workers\.length/);
 assert.match(source,/workstationCenters\.size!==snapshot\.workstations\.length/);
 assert.match(source,/attendanceSeqs\.size!==snapshot\.attendance\.length/);
 assert.match(source,/auditSeqs\.size!==snapshot\.audit\.length/);
 assert.match(source,/counterNames\.size!==snapshot\.counters\.length/);
 const validation=source.indexOf("episodeIds.size!==snapshot.episodes.length");
 const connect=source.indexOf("const client=await db.pool.connect()",source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.ok(validation>=0&&connect>validation);
});


test("restore requires an active administrative master identity",()=>{
 assert.match(source,/masterSnapshot=snapshot\.workers\.find\(\(x:any\)=>String\(x\.id\)===MASTER\(\)\)/);
 assert.match(source,/!masterSnapshot\|\|masterSnapshot\.role!=="admin"\|\|masterSnapshot\.active!==true/);
 assert.match(source,/invalid_recovery_snapshot_master/);
 const validation=source.indexOf("invalid_recovery_snapshot_master");
 const connect=source.indexOf("const client=await db.pool.connect()",source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.ok(validation>=0&&connect>validation);
});


test("restore takes exclusive table locks before destructive replacement",()=>{
 const start=source.indexOf('path==="/api/internal-clinical/recovery/restore"');
 const route=source.slice(start);
 const lock=route.indexOf("LOCK TABLE internal_attendance_events,internal_center_workstations,internal_clinical_episodes,internal_clinical_workers,internal_clinical_audit,internal_clinical_counters IN ACCESS EXCLUSIVE MODE");
 const truncate=route.indexOf("TRUNCATE TABLE internal_attendance_events RESTART IDENTITY");
 assert.ok(lock>=0&&truncate>lock);
});


test("restore validates real bcrypt hash syntax and domain semantics",()=>{
 assert.ok(source.includes('BCRYPT_HASH=/^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$/;'));
 assert.match(source,/invalid_recovery_snapshot_semantics/);
 assert.match(source,/DELEGABLE_PRIVILEGES\.has\(String\(p\)\)/);
 assert.match(source,/RECOVERY_EPISODE_STATUSES\.has\(String\(x\.status\)\)/);
});


test("restore validates attendance and audit referential semantics",()=>{
 assert.match(source,/attendanceBySeq=new Map/);
 assert.match(source,/x\.event_type==="CORRECTION"/);
 assert.match(source,/!\["CLOCK_IN","CLOCK_OUT"\]\.includes\(String\(related\.event_type\)\)/);
 assert.match(source,/String\(related\.worker_id\)!==String\(x\.worker_id\)/);
 assert.match(source,/x\.event_type!=="CORRECTION"&&x\.related_event_seq!=null/);
 assert.match(source,/badAuditReference=snapshot\.audit\.some/);
 assert.match(source,/!workerIds\.has\(String\(x\.actor_id\)\)/);
 assert.match(source,/x\.episode_id!=null&&!episodeIds\.has\(String\(x\.episode_id\)\)/);
});


test("recovery preserves workstation network binding",()=>{
 assert.match(source,/SELECT id,center,label,credential_hash,active,created_at,revoked_at,claimed_at,network_fingerprint_hash FROM internal_center_workstations/);
 assert.match(source,/INSERT INTO internal_center_workstations\(id,center,label,credential_hash,active,created_at,revoked_at,claimed_at,network_fingerprint_hash\)/);
 assert.match(source,/x\.network_fingerprint_hash/);
 assert.match(source,/x\.claimed_at!=null&&!\/\^\[a-f0-9\]\{64\}\$\/\.test\(String\(x\.network_fingerprint_hash\|\|""\)\)/);
});


test("snapshot is generated from one repeatable-read transaction",()=>{
 const start=source.indexOf('path==="/api/internal-clinical/recovery/snapshot"');
 const route=source.slice(start,source.indexOf('path==="/api/internal-clinical/recovery/restore"',start));
 assert.match(route,/client\.query\("BEGIN ISOLATION LEVEL REPEATABLE READ"\)/);
 assert.match(route,/auditOnClient\(client,w,"RECOVERY_SNAPSHOT_EXPORTED"\)/);
 assert.match(route,/client\.query\("COMMIT"\)/);
 assert.match(route,/client\.query\("ROLLBACK"\)/);
 assert.doesNotMatch(route,/Promise\.all/);
});


test("restore rejects duplicate center assignments before mutation",()=>{
 assert.match(source,/new Set\(x\.centers\.map\(\(center:any\)=>String\(center\)\)\)\.size!==x\.centers\.length/);
 assert.match(source,/workstationCenterSet=new Set\(snapshot\.workstations\.map/);
 assert.match(source,/workstationCenterSet\.size!==snapshot\.workstations\.length/);
 const validation=source.indexOf("workstationCenterSet.size!==snapshot.workstations.length");
 const connect=source.indexOf("const client=await db.pool.connect()",source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.ok(validation>=0&&connect>validation);
});
