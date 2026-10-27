import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920190000_public-web-v1/migration.sql",import.meta.url),"utf8");
const authContext=fs.readFileSync(new URL("../../frontend/src/contexts/AuthContext.jsx",import.meta.url),"utf8");
const portal=fs.readFileSync(new URL("../../frontend/src/pages/AccessPortal.jsx",import.meta.url),"utf8");
const studentAccess=fs.readFileSync(new URL("../../frontend/src/pages/StudentAccess.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");

test("student access is separated from team access and has no public registration",()=>{
  assert.equal(/emergentagent\.com/i.test(api+"\n"+authContext+"\n"+portal+"\n"+studentAccess),false);
  assert.equal(portal.includes('to="/alumnado/acceso"'),true);
  assert.equal(portal.includes('to="/interno/acceso"'),true);
  assert.equal(studentAccess.includes('login(email.trim(), password)'),true);
  assert.equal(studentAccess.includes('register('),false);
  assert.equal(studentAccess.includes('No se permite el registro público'),true);
});

test("student dashboard requires an authenticated public session",()=>{
  assert.match(app,/path="\/alumnado\/acceso"\s+element=\{<StudentAccess\/>\}/);
  assert.match(app,/path="\/dashboard"\s+element=\{<StudentAuthenticated><Dashboard\/><\/StudentAuthenticated>\}/);
  assert.match(app,/user\?children:<Navigate to="\/alumnado\/acceso" replace\/>/);
});

test("public auth retains opaque revocable secure cookie sessions",()=>{
  assert.equal(api.includes("gasi_public_session"),true);
  assert.equal(api.includes("HttpOnly; Secure; SameSite=Lax"),true);
  assert.equal(api.includes("token_hash"),true);
  assert.equal(api.includes("DELETE FROM public_sessions WHERE user_id=$1"),true);
  assert.equal(/auth\/login[\s\S]*withCredentials:\s*true/.test(authContext),true);
  assert.equal(/jsonwebtoken|JWT_SECRET_KEY/.test(api),false);
});

test("public auth enforces unique identities and login throttling",()=>{
  assert.equal(migration.includes("public_users_email_lower_uq"),true);
  assert.equal(migration.includes("token_hash TEXT NOT NULL UNIQUE"),true);
  assert.equal(migration.includes("UNIQUE(user_id, course_id)"),true);
  assert.equal(api.includes("bcrypt.hash(password,12)"),true);
  assert.equal(api.includes("too_many_login_attempts"),true);
});
