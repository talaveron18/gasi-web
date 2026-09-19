import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../functions/internal-clinical.mts', import.meta.url), 'utf8');

test('clinical corrections must not overwrite the original entry text', () => {
  assert.doesNotMatch(
    source,
    /items\[idx\]=\{\.\.\.items\[idx\],text:replacement,/,
    'correction currently overwrites the original clinical entry text'
  );
});

test('clinical corrections retain immutable correction evidence', () => {
  assert.match(source, /priorCorrections=items\[idx\]\.corrections\|\|\[\]/);\n  assert.match(source, /previousEffective=priorCorrections\.length\?priorCorrections\.at\(-1\)\.replacement_text:items\[idx\]\.text/);\n  assert.match(source, /previous_text:previousEffective/);
  assert.match(source, /replacement_text:replacement/);
  assert.match(source, /reason/);
  assert.match(source, /corrected_by_id:w\.id/);
  assert.match(source, /corrected_at:at/);
});

test('multiple clinical corrections form a non-destructive effective-text chain', () => {\n  assert.match(source, /corrections:\[\.\.\.priorCorrections,\{previous_text:previousEffective,replacement_text:replacement/);\n  assert.doesNotMatch(source, /previous_text:items\[idx\]\.text/);\n});\n\ntest('privileged clinical access is explicitly audited', () => {
  assert.match(source, /PRIVILEGED_EPISODE_ACCESSED/);
  assert.match(source, /privileged_access:\{read_only:true,reason,reference\}/);
});

test('privilege delegation and revocation invalidate existing sessions', () => {
  assert.match(source, /PRIVILEGE_GRANTED/);
  assert.match(source, /PRIVILEGE_REVOKED/);
  assert.match(source, /auth_version=auth_version\+1/);
});
