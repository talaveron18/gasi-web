import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(new URL("../functions/internal-clinical.mts", import.meta.url), "utf8");
const ui = fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkers.jsx", import.meta.url), "utf8");
const focused = fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalFocusedEpisode.jsx", import.meta.url), "utf8");

test("privileged clinical read permission identifier is identical in UI and API", () => {
  assert.match(api, /has\(w,"clinical_privileged_read"\)/);
  assert.match(ui, /clinical_privileged_read/);
  assert.doesNotMatch(ui, /clinical_record_privileged_read/);
  assert.match(focused, /clinical_privileged_read/);
  assert.doesNotMatch(focused, /clinical_record_privileged_read/);
});

test("privileged access remains explicit read-only and audited", () => {
  assert.match(api, /PRIVILEGED_EPISODE_ACCESSED/);
  assert.match(api, /privileged_access:\{read_only:true,reason,reference\}/);
});


test("professional roles can carry delegated administrative worker management without losing clinical role",()=>{
 const auth=fs.readFileSync(new URL("../../frontend/src/contexts/InternalPrototypeAuthContext.jsx",import.meta.url),"utf8");
 const profile=fs.readFileSync(new URL("../../frontend/src/pages/InternalProfile.jsx",import.meta.url),"utf8");
 assert.match(auth,/delegatedPrivileges\?\.includes\('worker_access_management'\)/);
 assert.match(profile,/canManageWorkers/);
 assert.match(profile,/canManageWorkers\s*&&\s*<Link to="\/interno\/trabajadores"/);
 assert.match(profile,/session\.role\s*!==\s*'admin'\s*&&\s*<Link to="\/interno\/fichaje"/);
});


test("privileged access accepts only explicit operational reasons",()=>{
 assert.match(api,/PRIVILEGED_ACCESS_REASONS=new Set\(\["authority_request","inspection","incident_review","legal_process"\]\)/);
 assert.match(api,/!PRIVILEGED_ACCESS_REASONS\.has\(reason\).*invalid_privileged_access_reason/);
 const start=api.indexOf("const privileged=path.match");
 const route=api.slice(start,start+3600);
 const validate=route.indexOf("PRIVILEGED_ACCESS_REASONS.has(reason)");
 const fullLoad=route.indexOf("SELECT * FROM internal_clinical_episodes");
 assert.ok(validate>=0&&fullLoad>validate,"reason must be validated before narrative load");
});
