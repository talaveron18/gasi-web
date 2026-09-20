import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920151000_explicit-tenant-isolation/migration.sql",import.meta.url),"utf8");
const auth=fs.readFileSync(new URL("../../frontend/src/contexts/InternalPrototypeAuthContext.jsx",import.meta.url),"utf8");
const workers=fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkers.jsx",import.meta.url),"utf8");
const workstations=fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkstations.jsx",import.meta.url),"utf8");

test("schema has explicit tenant boundary for every operational collection",()=>{
 assert.match(migration,/internal_clinical_workers[\s\S]*tenant_id TEXT NOT NULL/);
 assert.match(migration,/internal_clinical_episodes[\s\S]*tenant_id TEXT NOT NULL/);
 assert.match(migration,/internal_center_workstations[\s\S]*tenant_id TEXT NOT NULL/);
 assert.match(migration,/internal_attendance_events[\s\S]*tenant_id TEXT NOT NULL/);
 assert.match(migration,/uq_internal_center_workstations_tenant_center/);
 assert.match(migration,/ON internal_center_workstations\(tenant_id, center\)/);
});

test("authenticated identity and writable episodes carry tenant scope",()=>{
 assert.match(api,/SELECT id,tenant_id,role,display_name,centers,active,auth_version/);
 assert.match(api,/profile=\(w:any\)=>\(\{id:w\.id,tenant_id:w\.tenant_id/);
 assert.match(api,/WHERE id=\$1 AND tenant_id=\$2 AND center = ANY\(\$3::text\[\]\) AND discipline=\$4/);
 assert.match(api,/workstation_tenant_denied/);
});

test("delegated worker administration cannot cross tenant",()=>{
 assert.match(api,/managedWorkerForUpdate/);
 assert.match(api,/WHERE id=\$1 AND tenant_id=\$2 AND role<>'admin'/);
 assert.match(api,/worker_tenant_management_denied/);
 assert.match(api,/target_tenant_id:tenantId/);
});

test("master configuration UI sends explicit tenant for identities and workstations",()=>{
 assert.match(auth,/tenantId:w\.tenant_id\|\|''/);
 assert.match(auth,/payload\.tenant_id=tenantId/);
 assert.match(workers,/Cliente \/ tenant/);
 assert.match(workstations,/tenant_id/);
 assert.match(workstations,/Cliente \/ tenant/);
});

test("legacy tenant inference fails closed when scope is ambiguous",()=>{
 assert.match(api,/LIMIT 2/);
 assert.match(api,/q\.rows\.length===1\?String\(q\.rows\[0\]\.tenant_id\|\|""\):""/);
 assert.match(api,/tenant_id_required/);
});


test("audit events retain actor tenant scope without clinical narrative",()=>{
 assert.match(api,/auditMetadata\(\{\.\.\.metadata,actor_tenant_id:String\(w\.tenant_id\|\|""\)\}\)/);
 assert.match(api,/FORBIDDEN_AUDIT_KEYS=new Set\(\["patient_ref","patientref","summary","text","replacement_text","previous_text"/);
});
