import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");

test("public API emits request correlation and timing headers",()=>{
  assert.equal(api.includes('response.headers.set("x-request-id",requestId)'),true);
  assert.equal(api.includes('response.headers.set("server-timing",`app;dur=${durationMs}`)'),true);
  assert.equal(api.includes("crypto.randomUUID()"),true);
});

test("public request logs use only coarse surface metadata",()=>{
  assert.equal(api.includes("coarseSurface"),true);
  assert.equal(api.includes("public_api_request"),true);
  assert.equal(api.includes("request_id:requestId"),true);
  assert.equal(api.includes("surface,"),true);
  assert.equal(api.includes("duration_ms:durationMs"),true);
  assert.equal(api.includes("clientSource(req)"),true);
});

test("public request log payload contains no user course or network identifiers",()=>{
  const start=api.indexOf('console.info("public_api_request"');
  const end=api.indexOf("return response;",start);
  assert.ok(start>=0&&end>start);
  const block=api.slice(start,end);
  for(const forbidden of ["user_id","course_id","email","cookie","authorization","x-forwarded-for","x-nf-client-connection-ip","pathname","payload","body"]){
    assert.equal(block.includes(forbidden),false,forbidden+" must not be logged");
  }
});
