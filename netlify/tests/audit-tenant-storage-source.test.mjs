import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20261029080000_internal-audit-tenant-scope/migration.sql',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../functions/internal-clinical.mts',import.meta.url),'utf8');

test('audit tenant scope is derived from authenticated actor metadata and indexed',()=>{
  assert.match(runtime,/actor_tenant_id:String\(w\.tenant_id\|\|""\)/);
  assert.match(migration,/tenant_id TEXT GENERATED ALWAYS AS/);
  assert.match(migration,/metadata->>'actor_tenant_id'/);
  assert.match(migration,/idx_internal_clinical_audit_tenant_time/);
  assert.match(migration,/ON internal_clinical_audit\(tenant_id, at DESC, seq DESC\)/);
  assert.match(migration,/idx_internal_clinical_audit_tenant_episode_time/);
});

test('audit tenant scope cannot silently become empty',()=>{
  assert.match(migration,/internal_clinical_audit_tenant_nonempty/);
  assert.match(migration,/CHECK \(btrim\(tenant_id\) <> ''\)/);
  assert.match(migration,/GASI-LEGACY/);
});
