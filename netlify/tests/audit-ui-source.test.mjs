import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync(new URL("../../frontend/src/pages/InternalAudit.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const profile=fs.readFileSync(new URL("../../frontend/src/pages/InternalProfile.jsx",import.meta.url),"utf8");

test("master audit console is authenticated and master-gated",()=>{
 assert.match(app,/path="\/interno\/auditoria" element=\{<Guard><InternalAudit\/><\/Guard>\}/);
 assert.match(page,/if\(!isMaster\)return/);
 assert.match(page,/\/api\/internal-clinical\/audit\?limit=500/);
 assert.match(profile,/to="\/interno\/auditoria"/);
});

test("audit console exposes traceability metadata without clinical narrative fields",()=>{
 assert.match(page,/row\.event_hash/);
 assert.match(page,/row\.previous_hash/);
 assert.match(page,/Object\.entries\(row\.metadata\|\|\{\}\)/);
 assert.doesNotMatch(page,/patient_ref|summary|diagnosis|symptoms|clinical_note/);
});
