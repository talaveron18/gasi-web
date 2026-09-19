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


test("delegated privileges are allowlisted and mutated atomically with audit",()=>{
 assert.match(api,/DELEGABLE_PRIVILEGES=new Set\(\["worker_access_management","clinical_privileged_read"\]\)/);
 assert.match(api,/!DELEGABLE_PRIVILEGES\.has\(p\).*invalid_privilege/);
 const start=api.indexOf("const privilege=path.match");
 const route=api.slice(start,start+4200);
 assert.match(route,/FOR UPDATE/);
 assert.match(route,/auth_version=auth_version\+1/);
 assert.match(route,/auditOnClient\(client,w,grant\?"PRIVILEGE_GRANTED":"PRIVILEGE_REVOKED"/);
 const auditAt=route.indexOf("auditOnClient");
 const commitAt=route.indexOf('client.query("COMMIT")');
 assert.ok(auditAt>=0&&commitAt>auditAt);
});

test("identity activation and revocation are atomic with auth-version invalidation and audit",()=>{
 const start=api.indexOf("const access=path.match");
 const route=api.slice(start,start+3600);
 assert.match(route,/FOR UPDATE/);
 assert.match(route,/auth_version=auth_version\+1/);
 assert.match(route,/auditOnClient\(client,w,active\?"IDENTITY_REACTIVATED":"IDENTITY_REVOKED"/);
 const auditAt=route.indexOf("auditOnClient");
 const commitAt=route.indexOf('client.query("COMMIT")');
 assert.ok(auditAt>=0&&commitAt>auditAt);
});


test("delegated worker managers cannot create or control administrative identities",()=>{
 assert.match(api,/role==="admin"&&w\.id!==MASTER\(\).*admin_identity_management_master_only/);
 const accessStart=api.indexOf("const access=path.match");
 const accessRoute=api.slice(accessStart,accessStart+4200);
 assert.match(accessRoute,/target\.role==="admin"&&w\.id!==MASTER\(\).*admin_identity_management_master_only/);
 assert.match(api,/const privilege=path\.match/);
 assert.match(api,/if\(w\.id!==MASTER\(\)\)return json\(\{detail:"master_required"\},403\)/);
});


test("delegated worker-management UI hides administrative identity controls",()=>{
 const workersUi=fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkers.jsx",import.meta.url),"utf8");
 assert.match(workersUi,/const availableRoles = isMaster \? ROLE_OPTIONS : ROLE_OPTIONS\.filter\(\(\[role\]\)=>role!=='admin'\)/);
 assert.match(workersUi,/i\.role==='admin'&&!isMaster\?<span className="text-slate-500">Solo cuenta maestra<\/span>/);
});


test("delegated worker management is center-scoped at query and mutation time",()=>{
 assert.match(api,/const managementCenters=\(w:any\)=>w\.id===MASTER\(\)\?null:/);
 assert.match(api,/const canManageWorkerCenters=/);
 assert.match(api,/WHERE role<>'admin' AND centers <@ \$1::jsonb ORDER BY display_name,id/);
 assert.match(api,/worker_center_management_denied/);
 const create=api.slice(api.indexOf('if(req.method==="POST"&&path==="/api/internal-clinical/workers")'),api.indexOf("const access=path.match"));
 assert.match(create,/!canManageWorkerCenters\(w,centers\)/);
 const access=api.slice(api.indexOf("const access=path.match"),api.indexOf("const passwordReset=path.match"));
 assert.match(access,/WHERE id=\$1 AND role<>'admin' AND centers <@ \$2::jsonb FOR UPDATE/);
 assert.match(access,/worker_not_visible/);
 const reset=api.slice(api.indexOf("const passwordReset=path.match"),api.indexOf("const privilege=path.match"));
 assert.match(reset,/WHERE id=\$1 AND role<>'admin' AND centers <@ \$2::jsonb FOR UPDATE/);
 assert.match(reset,/worker_not_visible/);
});


test("delegated direct-id worker mutations stay invisible across centers",()=>{
 const access=api.slice(api.indexOf("const access=path.match"),api.indexOf("const passwordReset=path.match"));
 const accessSelect=access.indexOf("WHERE id=$1 AND role<>'admin' AND centers <@ $2::jsonb FOR UPDATE");
 const accessTarget=access.indexOf("const target=q.rows[0]");
 assert.ok(accessSelect>=0&&accessTarget>accessSelect);
 const reset=api.slice(api.indexOf("const passwordReset=path.match"),api.indexOf("const privilege=path.match"));
 const resetSelect=reset.indexOf("WHERE id=$1 AND role<>'admin' AND centers <@ $2::jsonb FOR UPDATE");
 const resetTarget=reset.indexOf("const target=q.rows[0]");
 assert.ok(resetSelect>=0&&resetTarget>resetSelect);
});
