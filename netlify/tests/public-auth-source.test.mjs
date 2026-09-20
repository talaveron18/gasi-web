import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const authRoute=fs.readFileSync(new URL("../../backend/routes/auth.py",import.meta.url),"utf8");
const authCore=fs.readFileSync(new URL("../../backend/auth.py",import.meta.url),"utf8");
const server=fs.readFileSync(new URL("../../backend/server.py",import.meta.url),"utf8");
const authContext=fs.readFileSync(new URL("../../frontend/src/contexts/AuthContext.jsx",import.meta.url),"utf8");
const training=fs.readFileSync(new URL("../../frontend/src/pages/FormacionSanitaria.jsx",import.meta.url),"utf8");

test("public auth has no demo provider fallback",()=>{
  const joined=authRoute+"\n"+authContext+"\n"+training;
  assert.doesNotMatch(joined,/emergentagent\.com/i);
  assert.match(authRoute,/oauth_not_configured/);
  assert.match(training,/REACT_APP_OAUTH_LOGIN_URL/);
  assert.match(training,/OAUTH_LOGIN_URL &&/);
});

test("public auth uses revocable local cookie sessions",()=>{
  assert.match(authRoute,/set_session_cookie\(response, token\)/);
  assert.match(authRoute,/token = create_access_token\(\{"user_id": user_id, "email": oauth_data\["email"\]\}\)/);
  assert.match(authContext,/auth\/register[\s\S]*withCredentials: true/);
  assert.match(authCore,/db\.user_sessions\.find_one/);
  assert.match(authCore,/Session expired or revoked/);
  assert.match(server,/allow_credentials=True/);
});

test("public auth refuses weak secrets and enforces unique session identities",()=>{
  assert.doesNotMatch(authCore,/default_secret_key/);
  assert.match(authCore,/JWT_SECRET_KEY must be configured with at least 32 bytes/);
  assert.match(server,/uniq_public_user_email/);
  assert.match(server,/uniq_public_session_token/);
  assert.match(server,/uniq_user_course_enrollment/);
});
