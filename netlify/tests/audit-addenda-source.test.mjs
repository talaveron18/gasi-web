import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../functions/internal-clinical.mts", import.meta.url), "utf8");

test("clinical corrections preserve original entry text and append traceable correction", () => {
  assert.match(source,/previousEffective=priorCorrections\.length\?priorCorrections\.at\(-1\)\.replacement_text:items\[idx\]\.text/);
  assert.match(source,/items\[idx\]=\{\.\.\.items\[idx\],corrections:/);
  assert.doesNotMatch(source,/items\[idx\]=\{\.\.\.items\[idx\],text:replacement,corrections:/);
  assert.match(source,/previous_text:previousEffective,replacement_text:replacement,reason,corrected_by_id:w\.id,corrected_at:at/);
});

test("privileged clinical access is explicit, read-only and audited", () => {
  assert.match(source,/clinical_privileged_read/);
  assert.match(source,/PRIVILEGED_EPISODE_ACCESSED/);
  assert.match(source,/privileged_access:\{read_only:true,reason,reference\}/);
});

test("delegated privilege grant and revoke rotate auth version and are audited", () => {
  assert.ok(source.includes('privileges\\/(grant|revoke)'), "privilege grant/revoke route must exist");
  assert.match(source,/auth_version=auth_version\+1/);
  assert.match(source,/PRIVILEGE_GRANTED/);
  assert.match(source,/PRIVILEGE_REVOKED/);
});


test("global audit metadata does not copy free-text clinical correction or delivery reasons",()=>{
  assert.match(source,/CLINICAL_ENTRY_CORRECTED",\{episode_id:id,entry_id:itemId,entry_kind:kind,reason_recorded:true\}/);
  assert.doesNotMatch(source,/CLINICAL_ENTRY_CORRECTED",\{[^}]*,reason\}/);
  assert.match(source,/DELIVERY_STATE_CHANGED",\{episode_id:id,state,reason_recorded:Boolean\(reason\)\}/);
  assert.doesNotMatch(source,/DELIVERY_STATE_CHANGED",\{[^}]*\{reason\}/);
});
