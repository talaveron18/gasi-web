import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920190000_public-web-v1/migration.sql",import.meta.url),"utf8");
const authContext=fs.readFileSync(new URL("../../frontend/src/contexts/AuthContext.jsx",import.meta.url),"utf8");
const portal=fs.readFileSync(new URL("../../frontend/src/pages/AccessPortal.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");

test("dormant public auth has no demo provider fallback and is not advertised from the access gateway",()=>{
  const joined=api+"\n"+authContext+"\n"+portal;
  assert.equal(/emergentagent\.com/i.test(joined),false);
  assert.equal(api.includes("oauth_not_configured"),true);
  assert.equal(portal.includes("REACT_APP_OAUTH_LOGIN_URL"),false);
  assert.equal(portal.includes("openAuth"),false);
  assert.equal(portal.includes("Acceso no habilitado"),true);
});

test("legacy student dashboard routes fail closed to the generic access gateway",()=>{
  assert.match(app,/path="\/dashboard"\s+element=\{<Navigate\s+to="\/acceso"\s+replace\s*\/>\}/);
  assert.match(app,/path="\/dashboard\/admin\/cursos"\s+element=\{<Navigate\s+to="\/acceso"\s+replace\s*\/>\}/);
});

test("dormant public auth retains opaque revocable secure cookie sessions for future separated access",()=>{
  assert.equal(api.includes("gasi_public_session"),true);
  assert.equal(api.includes("HttpOnly; Secure; SameSite=Lax"),true);
  assert.equal(api.includes("token_hash"),true);
  assert.equal(api.includes("DELETE FROM public_sessions WHERE user_id=$1"),true);
  assert.equal(/auth\/register[\s\S]*withCredentials:\s*true/.test(authContext),true);
  assert.equal(/jsonwebtoken|JWT_SECRET_KEY/.test(api),false);
});

test("dormant public auth enforces unique identities and login throttling",()=>{
  assert.equal(migration.includes("public_users_email_lower_uq"),true);
  assert.equal(migration.includes("token_hash TEXT NOT NULL UNIQUE"),true);
  assert.equal(migration.includes("UNIQUE(user_id, course_id)"),true);
  assert.equal(api.includes("bcrypt.hash(password,12)"),true);
  assert.equal(api.includes("too_many_login_attempts"),true);
});
