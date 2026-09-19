import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260919230500_worker-password-change/migration.sql",import.meta.url),"utf8");
const auth=fs.readFileSync(new URL("../../frontend/src/contexts/InternalPrototypeAuthContext.jsx",import.meta.url),"utf8");
const access=fs.readFileSync(new URL("../../frontend/src/pages/InternalAccess.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");

test("new workers are marked for mandatory password change",()=>{
 assert.match(migration,/must_change_password BOOLEAN NOT NULL DEFAULT FALSE/);
 assert.match(api,/password_hash,must_change_password\) VALUES\(\$1,\$2,\$3,\$4::jsonb,TRUE,1,'\[\]'::jsonb,\$5,TRUE\)/);
 assert.match(api,/must_change_password:true/);
});

test("temporary-password sessions are operationally blocked except password session profile and logout",()=>{
 assert.match(api,/w\.must_change_password===true/);
 assert.match(api,/password_change_required/);
 assert.match(api,/path\.endsWith\("\/password"\)/);
 assert.match(api,/path\.endsWith\("\/logout"\)/);
 assert.match(api,/path\.endsWith\("\/session"\)/);
 assert.match(api,/path\.endsWith\("\/profile"\)/);
 assert.match(api,/SET password_hash=\$2,must_change_password=FALSE,auth_version=auth_version\+1/);
});

test("frontend forces first-login password replacement before protected routes",()=>{
 assert.match(auth,/mustChangePassword:w\.must_change_password===true/);
 assert.match(auth,/changePassword=async\(currentPassword,newPassword\)/);
 assert.match(app,/if\(session\?\.mustChangePassword\)return <Navigate to="\/interno\/acceso" replace\/>/);
 assert.match(access,/session\.mustChangePassword/);
 assert.match(access,/Cambiar contraseña y cerrar sesión/);
 assert.match(access,/if\(!signed\.mustChangePassword\)navigate\('\/interno\/clinica'\)/);
});

test("recovery preserves mandatory password-change state",()=>{
 assert.match(api,/password_hash,must_change_password,created_at FROM internal_clinical_workers/);
 assert.match(api,/x\.must_change_password!=null&&typeof x\.must_change_password!=="boolean"/);
 assert.match(api,/password_hash,must_change_password,created_at\) VALUES/);
});


test("worker directory maps authoritative access and first-login state",()=>{
 assert.match(auth,/status:w\.operational_state\|\| \(w\.active===false\?'REVOKED':'ACTIVE'\)/);
 assert.match(auth,/mustChangePassword:w\.must_change_password===true/);
 const workers=fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkers.jsx",import.meta.url),"utf8");
 assert.match(workers,/Contraseña temporal/);
 assert.match(workers,/Completado/);
});
