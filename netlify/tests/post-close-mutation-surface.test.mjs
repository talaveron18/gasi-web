import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../functions/internal-clinical.mts", import.meta.url), "utf8");

test("all post-close clinical mutation families are explicitly guarded", () => {
  const expected=["levelMatch","responseMatch","lateReview","addendumMatch","correct","disposition","responseDelivery","delivery"];
  for(const marker of expected){
    const start=source.indexOf(`if(req.method==="POST"&&${marker})`);
    assert.notEqual(start,-1,`missing route ${marker}`);
    const next=source.indexOf("\n const ",start+1);
    const block=source.slice(start,next===-1?source.length:next);
    assert.match(block,/status==="CERRADO"/,`${marker} can mutate a closed episode`);
  }
});

test("correction route keeps original text immutable", () => {
  assert.doesNotMatch(source,/items\[idx\]=\{\.\.\.items\[idx\],text:replacement/);
  assert.match(source,/previous_text:previousEffective,replacement_text:replacement/);
});
