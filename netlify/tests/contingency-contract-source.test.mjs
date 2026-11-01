import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920161000_contingency-channels/migration.sql",import.meta.url),"utf8");

test("contingency storage is tenant/center keyed and rejects reserved master tenant",()=>{
  assert.match(migration,/PRIMARY KEY \(tenant_id, center\)/);
  assert.match(migration,/tenant_id <> '__MASTER__'/);
  assert.match(migration,/channel_type IN \('PHONE','URL','REFERENCE'\)/);
  assert.match(migration,/updated_by_id TEXT NOT NULL REFERENCES internal_clinical_workers\(id\)/);
});

test("contingency targets are deliberately constrained and URL channels are HTTPS only",()=>{
  assert.match(runtime,/const CONTINGENCY_TYPES=new Set\(\["PHONE","URL","REFERENCE"\]\)/);
  assert.match(runtime,/parsed\.protocol!=="https:"\|\|parsed\.username\|\|parsed\.password/);
  assert.match(runtime,/\^\[\+0-9\(\)\.\\s-\]\{5,40\}\$/);
  assert.match(runtime,/String\(x\.tenant_id\)===MASTER_TENANT/);
});

test("contingency participates in signed recovery snapshots",()=>{
  assert.match(runtime,/contingency:snapshot\.contingency/);
  assert.match(runtime,/recoverySnapshotSignature/);
  assert.match(runtime,/validContingencySnapshotChannel/);
});
