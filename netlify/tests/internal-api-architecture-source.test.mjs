import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root=fs.readFileSync(new URL("../../frontend/src/lib/internalApiRoot.js",import.meta.url),"utf8");
const auth=fs.readFileSync(new URL("../../frontend/src/contexts/InternalPrototypeAuthContext.jsx",import.meta.url),"utf8");
const client=fs.readFileSync(new URL("../../frontend/src/lib/internalClinicalApi.js",import.meta.url),"utf8");

test("internal production API root is same-origin and external override is development-only",()=>{
  assert.equal(root.includes("NODE_ENV === 'development'"),true);
  assert.equal(root.includes("REACT_APP_BACKEND_URL"),true);
  assert.equal(root.includes("'/api/internal-clinical'"),true);
  assert.equal(auth.includes("REACT_APP_BACKEND_URL"),false);
  assert.equal(client.includes("REACT_APP_BACKEND_URL"),false);
});

test("internal auth and clinical client consume the shared root",()=>{
  assert.equal(auth.includes("INTERNAL_API_ROOT"),true);
  assert.equal(auth.includes("${INTERNAL_API_ROOT}/login"),true);
  assert.equal(auth.includes("${INTERNAL_API_ROOT}/session"),true);
  assert.equal(client.includes("internalApiRoot(baseUrl)"),true);
  assert.equal(client.includes("const root=internalApiRoot(baseUrl)"),true);
});

test("explicit client base remains an injectable test seam without changing production default",()=>{
  assert.equal(root.includes("internalApiRoot = (baseUrl = null)"),true);
  assert.equal(root.includes("return explicit ?"),true);
  assert.equal(client.includes("baseUrl=null"),true);
});
