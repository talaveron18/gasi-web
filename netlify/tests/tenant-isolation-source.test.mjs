import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../functions/internal-clinical.mts', import.meta.url), 'utf8');

test('episode collection is tenant-scoped at the database query', () => {
  assert.doesNotMatch(
    source,
    /SELECT \* FROM internal_clinical_episodes ORDER BY created_at DESC LIMIT 250/,
    'P0 tenant isolation: collection endpoint must not load every tenant episode and filter only in application memory'
  );
});

test('direct episode access keeps an explicit authorization check', () => {
  assert.match(source, /if\(!canRead\(w,e\)\)return json\(\{detail:"episode_access_denied"\},403\)/);
});

test('clinical writes require assigned center and reject administrative role', () => {
  assert.match(source, /if\(w\.role==="admin"\)return json\(\{detail:"clinical_role_required"\},403\)/);
  assert.match(source, /if\(!w\.centers\?\.includes\(center\)\)return json\(\{detail:"assigned_center_required"\},403\)/);
});

test('session revocation is tied to auth_version', () => {
  assert.match(source, /Number\(w\.auth_version\)!==Number\(p\.av\)/);
  assert.match(source, /auth_version=auth_version\+1/);
});
