import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(new URL("../functions/internal-clinical.mts", import.meta.url), "utf8");
const ui = fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkers.jsx", import.meta.url), "utf8");

test("privileged clinical read permission identifier is identical in UI and API", () => {
  assert.match(api, /has\(w,"clinical_privileged_read"\)/);
  assert.match(ui, /clinical_privileged_read/);
  assert.doesNotMatch(ui, /clinical_record_privileged_read/);
});

test("privileged access remains explicit read-only and audited", () => {
  assert.match(api, /PRIVILEGED_EPISODE_ACCESSED/);
  assert.match(api, /privileged_access:\{read_only:true,reason,reference\}/);
});
