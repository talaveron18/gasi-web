import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync(new URL("../database/migrations/20260919223000_internal-audit-append-only/migration.sql",import.meta.url),"utf8");
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("clinical audit table is append-only at database level",()=>{
 assert.match(migration,/CREATE OR REPLACE FUNCTION internal_clinical_audit_immutable/);
 assert.match(migration,/BEFORE UPDATE OR DELETE ON internal_clinical_audit/);
 assert.match(migration,/internal clinical audit is append-only/);
});

test("recovery uses truncate rather than row delete for append-only audit",()=>{
 assert.match(source,/TRUNCATE TABLE internal_clinical_audit RESTART IDENTITY/);
 const restore=source.slice(source.indexOf('path==="/api/internal-clinical/recovery/restore"'));
 assert.doesNotMatch(restore,/DELETE FROM internal_clinical_audit/);
});


test("master audit-log reads are themselves audited",()=>{
 const start=source.indexOf('if(req.method==="GET"&&path==="/api/internal-clinical/audit")');
 assert.ok(start>=0);
 const route=source.slice(start,start+900);
 assert.match(route,/w\.id!==MASTER\(\).*master_account_only/);
 assert.match(route,/await audit\(db,w,"AUDIT_LOG_VIEWED",\{limit,before_seq:beforeSeq\|\|0\}\)/);
});
