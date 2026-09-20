import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260919230500_worker-password-change/migration.sql",import.meta.url),"utf8");
const auth=fs.readFileSync(new URL("../../frontend/src/contexts/InternalPrototypeAuthContext.jsx",import.meta.url),"utf8");
const access=fs.readFileSync(new URL("../../frontend/src/pages/InternalAccess.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const workers=fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkers.jsx",import.meta.url),"utf8");

test("new workers are marked for mandatory password change",()=>{
 assert.match(migration,/must_change_password BOOLEAN NOT NULL DEFAULT FALSE/);
 assert.match(api,/password_hash,must_change_password\\) VALUES\\(\\$1,\\$2,\\$3,\\$4,\\$5::jsonb,TRUE,1,'\\[\\]'::jsonb,\\$6,TRUE\\)/);
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
 assert.match(workers,/Contraseña temporal/);
 assert.match(workers,/Completado/);
});

test("password replacement rejects reuse and malformed values without internal errors",()=>{
 assert.match(api,/next\.length<12\|\|next\.length>128.*invalid_new_password/);
 assert.match(api,/next===current.*password_reuse_not_allowed/);
 assert.match(api,/temporaryPassword\.length<12\|\|temporaryPassword\.length>128.*invalid_temporary_password/);
});

test("administrative password reset is server-generated audited and revokes prior sessions",()=>{
 assert.match(api,/passwordReset=path\.match\(\/\^\\\/api\\\/internal-clinical\\\/workers\\\/\(\[\^\/\]\+\)\\\/password-reset\$\//);
 assert.match(api,/if\(!has\(w,"worker_access_management"\)\)return json\(\{detail:"worker_management_required"\},403\)/);
 assert.match(api,/crypto\.randomBytes\(18\)\.toString\("base64url"\)/);
 assert.match(api,/SET password_hash=\$2,must_change_password=TRUE,auth_version=auth_version\+1/);
 assert.match(api,/"PASSWORD_RESET_ISSUED"/);
 assert.match(api,/self_password_reset_requires_current_password/);
 assert.match(api,/master_password_reset_denied/);
 assert.match(auth,/resetIdentityPassword=async\(id\)/);
 assert.match(workers,/Contraseña temporal emitida\. Las sesiones anteriores han quedado revocadas\./);
 assert.match(workers,/Entrégala por un canal seguro\. El usuario deberá sustituirla al iniciar sesión\./);
});
