import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("transactional audit helper writes inside caller transaction",()=>{
 assert.match(source,/async function auditOnClient\(client:any,w:any,action:string,metadata:any=\{\}\)/);
 assert.match(source,/await auditOnClient\(client,w,"WORKSTATION_CLAIMED"/);
 assert.match(source,/await auditOnClient\(client,w,eventType==="CLOCK_IN"\?"ATTENDANCE_CLOCKED_IN":"ATTENDANCE_CLOCKED_OUT"/);
 assert.match(source,/await auditOnClient\(client,w,"EPISODE_CREATED"/);
 assert.match(source,/await auditOnClient\(client,w,"RECOVERY_RESTORED"/);
});

test("critical transactional mutations audit before commit",()=>{
 for(const marker of ["WORKSTATION_CLAIMED","ATTENDANCE_CLOCKED_IN","EPISODE_CREATED","RECOVERY_RESTORED"]){
  const at=source.indexOf(`auditOnClient(client,w,"${marker}"`);
  const flexible=marker==="ATTENDANCE_CLOCKED_IN"?source.indexOf('auditOnClient(client,w,eventType==="CLOCK_IN"'):at;
  const start=flexible>=0?flexible:at;
  assert.ok(start>=0,`missing atomic audit for ${marker}`);
  const commit=source.indexOf('client.query("COMMIT")',start);
  assert.ok(commit>start,`audit must precede commit for ${marker}`);
 }
});
