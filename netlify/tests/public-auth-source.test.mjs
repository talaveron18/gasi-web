import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920190000_public-web-v1/migration.sql",import.meta.url),"utf8");
const authContext=fs.readFileSync(new URL("../../frontend/src/contexts/AuthContext.jsx",import.meta.url),"utf8");
const training=fs.readFileSync(new URL("../../frontend/src/pages/FormacionSanitaria.jsx",import.meta.url),"utf8");

test("public auth has no demo provider fallback",()=>{
  const joined=api+"\n"+authContext+"\n"+training;
  assert.equal(/emergentagent\.com/i.test(joined),false);
  assert.equal(api.includes("oauth_not_configured"),true);
  assert.equal(training.includes("REACT_APP_OAUTH_LOGIN_URL"),true);
  assert.equal(training.includes("OAUTH_LOGIN_URL &&"),true);
});

test("public auth uses opaque revocable secure cookie sessions",()=>{
  assert.equal(api.includes("gasi_public_session"),true);
  assert.equal(api.includes("HttpOnly; Secure; SameSite=Lax"),true);
  assert.equal(api.includes("token_hash"),true);
  assert.equal(api.includes("DELETE FROM public_sessions WHERE user_id=$1"),true);
  assert.equal(/auth\/register[\s\S]*withCredentials:\s*true/.test(authContext),true);
  assert.equal(/jsonwebtoken|JWT_SECRET_KEY/.test(api),false);
});

test("public auth enforces unique identities and login throttling",()=>{
  assert.equal(migration.includes("public_users_email_lower_uq"),true);
  assert.equal(migration.includes("token_hash TEXT NOT NULL UNIQUE"),true);
  assert.equal(migration.includes("UNIQUE(user_id, course_id)"),true);
  assert.equal(api.includes("bcrypt.hash(password,12)"),true);
  assert.equal(api.includes("too_many_login_attempts"),true);
});
