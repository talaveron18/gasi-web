import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimeUrl = new URL('../functions/internal-clinical.mts', import.meta.url);
const tenantAuditUrl = new URL('../functions/internal-audit-tenant-chain.mts', import.meta.url);

const runtime = await readFile(runtimeUrl, 'utf8');
const tenantAudit = await readFile(tenantAuditUrl, 'utf8');

test('tenant audit primitive keeps lock and previous hash inside the authenticated tenant', () => {
  assert.match(tenantAudit, /tenantAuditLockId/);
  assert.match(tenantAudit, /WHERE tenant_id=\$1 ORDER BY seq DESC LIMIT 1/);
  assert.match(tenantAudit, /actor_tenant_id/);
});

test('effective clinical runtime must not append audit events through a global chain', () => {
  assert.doesNotMatch(
    runtime,
    /pg_advisory_xact_lock\(\$1\)[\s\S]{0,300}\[74627411\]/,
    'clinical runtime still serializes all tenants through the historical global audit lock',
  );
  assert.doesNotMatch(
    runtime,
    /SELECT event_hash FROM internal_clinical_audit ORDER BY seq DESC LIMIT 1/,
    'clinical runtime still derives previous_hash from the global audit chain',
  );
});

test('effective clinical runtime must not validate recovery audit snapshots as one global chain', () => {
  const validator = runtime.match(/function validAuditSnapshot\(rows:any\[\]\)\{[\s\S]*?\}function validAttendanceSnapshot/);
  assert.ok(validator, 'expected the clinical recovery audit validator to remain discoverable');
  assert.match(
    validator[0],
    /tenant_id|actor_tenant_id/,
    'recovery audit validation must preserve tenant boundaries instead of validating one global sequence',
  );
});
