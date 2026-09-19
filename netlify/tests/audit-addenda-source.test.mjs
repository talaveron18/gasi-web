import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../functions/internal-clinical.mts", import.meta.url), "utf8");

test("clinical corrections preserve original entry text and append traceable correction", () => {
  assert.match(source, /const at=new Date\(\)\.toISOString\(\),old=items\[idx\]\.text;/);
  assert.match(source, /items\[idx\]=\{\.\.\.items\[idx\],corrections:/);
  assert.doesNotMatch(source, /items\[idx\]=\{\.\.\.items\[idx\],text:replacement,corrections:/);
  assert.match(source, /previous_text:old,replacement_text:replacement,reason,corrected_by_id:w\.id,corrected_at:at/);
});

test("privileged clinical access is explicit, read-only and audited", () => {
  assert.match(source, /clinical_privileged_read/);
  assert.match(source, /PRIVILEGED_EPISODE_ACCESSED/);
  assert.match(source, /privileged_access:\{read_only:true,reason,reference\}/);
});

test("delegated privilege grant and revoke rotate auth version and are audited", () => {
  assert.ok(source.includes('privileges\\/(grant|revoke)'), "privilege grant/revoke route must exist");
  assert.match(source, /auth_version=auth_version\+1/);
  assert.match(source, /PRIVILEGE_GRANTED/);
  assert.match(source, /PRIVILEGE_REVOKED/);
});
