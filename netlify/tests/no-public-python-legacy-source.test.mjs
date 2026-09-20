import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../../",import.meta.url);
const server=fs.readFileSync(new URL("../../backend/server.py",import.meta.url),"utf8");
const auth=fs.readFileSync(new URL("../../backend/auth.py",import.meta.url),"utf8");
const workflow=fs.readFileSync(new URL("../../.github/workflows/internal-clinical-ci.yml",import.meta.url),"utf8");
const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");

const removedPublicRoutes=[
  "backend/routes/admin.py",
  "backend/routes/auth.py",
  "backend/routes/chatbot.py",
  "backend/routes/contact.py",
  "backend/routes/courses.py",
  "backend/routes/payments.py"
];

test("superseded public FastAPI routes stay removed",()=>{
  for(const relative of removedPublicRoutes){
    assert.equal(fs.existsSync(new URL("../../"+relative,import.meta.url)),false,relative+" must stay removed");
  }
});

test("legacy Python server remains internal opt-in only",()=>{
  assert.equal(server.includes("GASI_ENABLE_LEGACY_INTERNAL_HARNESS"),true);
  assert.equal(server.includes("internal_prototype.router"),true);
  assert.equal(server.includes("internal_access_prototype.router"),true);
  assert.equal(/routes import .*courses|routes import .*payments|routes import .*admin/.test(server),false);
});

test("Python auth helper cannot become a second public auth stack",()=>{
  assert.equal(/JWT|create_access_token|decode_token|get_current_user|Bearer/.test(auth),false);
  assert.equal(auth.includes("hash_password"),true);
  assert.equal(auth.includes("verify_password"),true);
});

test("readiness validates the deployable Netlify public API, not legacy Python public tests",()=>{
  assert.equal(workflow.includes("test_public_v1_security.py"),false);
  assert.equal(workflow.includes("functions/public-api.mts"),true);
  assert.equal(api.includes("getDatabase"),true);
  assert.equal(api.includes("public_courses"),true);
});
