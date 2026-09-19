import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../functions/internal-clinical.mts', import.meta.url), 'utf8');

test('clinical corrections must not overwrite the original entry text', () => {
  assert.doesNotMatch(source,/items\[idx\]=\{\.\.\.items\[idx\],text:replacement,/);
});

test('clinical corrections retain immutable correction evidence', () => {
  assert.match(source,/priorCorrections=items\[idx\]\.corrections\|\|\[\]/);
  assert.match(source,/previousEffective=priorCorrections\.length\?priorCorrections\.at\(-1\)\.replacement_text:items\[idx\]\.text/);
  assert.match(source,/previous_text:previousEffective/);
  assert.match(source,/replacement_text:replacement/);
  assert.match(source,/corrected_by_id:w\.id/);
  assert.match(source,/corrected_at:at/);
});

test('multiple clinical corrections form a non-destructive effective-text chain', () => {
  assert.match(source,/corrections:\[\.\.\.priorCorrections,\{previous_text:previousEffective,replacement_text:replacement/);
  assert.doesNotMatch(source,/previous_text:items\[idx\]\.text/);
});

test('privileged clinical access is explicitly audited', () => {
  assert.match(source,/PRIVILEGED_EPISODE_ACCESSED/);
  assert.match(source,/privileged_access:\{read_only:true,reason,reference\}/);
});

test('privilege delegation and revocation invalidate existing sessions', () => {
  assert.match(source,/PRIVILEGE_GRANTED/);
  assert.match(source,/PRIVILEGE_REVOKED/);
  assert.match(source,/auth_version=auth_version\+1/);
});


test('only the original author can correct a clinical entry',()=>{
  const start=source.indexOf('const correct=path.match');
  assert.ok(start>=0,'clinical correction route missing');
  const route=source.slice(start,start+2600);
  assert.match(route,/items\[idx\]\.author_id!==w\.id.*clinical_entry_correction_author_only/);
});
