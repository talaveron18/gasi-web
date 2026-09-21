import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("clinical API emits request correlation and timing headers",()=>{
  assert.equal(api.includes('response.headers.set("x-request-id",requestId)'),true);
  assert.equal(api.includes('response.headers.set("server-timing",`app;dur=${durationMs}`)'),true);
  assert.equal(api.includes("crypto.randomUUID()"),true);
});

test("clinical operational logs use coarse surfaces only",()=>{
  assert.equal(api.includes("clinicalSurface"),true);
  assert.equal(api.includes("internal_clinical_request"),true);
  assert.equal(api.includes("CLINICAL_LOG_SURFACES"),true);
});

test("clinical request log block contains no clinical or identity fields",()=>{
  const start=api.indexOf('console.info("internal_clinical_request"');
  const end=api.indexOf("return response;",start);
  assert.ok(start>=0&&end>start);
  const block=api.slice(start,end);
  for(const forbidden of [
    "patient_ref","episode_id","actor_id","worker_id","tenant_id","center","display_name",
    "email","cookie","authorization","x-forwarded-for","x-nf-client-connection-ip",
    "summary","text","replacement_text","diagnosis","symptoms","pathname","payload","body"
  ]){
    assert.equal(block.includes(forbidden),false,forbidden+" must not be logged");
  }
});
