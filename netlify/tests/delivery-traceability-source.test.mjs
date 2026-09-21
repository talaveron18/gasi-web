import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("message delivery/read receipts use only server-generated timestamps",()=>{
 const start=source.indexOf("const responseDelivery=path.match");
 assert.ok(start>=0,"response delivery route missing");
 const route=source.slice(start,start+2800);
 assert.match(route,/const at=new Date\(\)\.toISOString\(\),old=r\.status,evidence=\{kind,at\}/);
 assert.doesNotMatch(route,/b\.at/);
 assert.match(route,/status_history=\[\.\.\.\(r\.status_history\|\|\[\]\),\{at,from:old,to:next,evidence\}\]/);
});

test("general delivery state events also use server-generated timestamps",()=>{
 const start=source.indexOf("const delivery=path.match");
 assert.ok(start>=0,"general delivery route missing");
 const route=source.slice(start,start+2600);
 assert.match(route,/const event=\{state,at:new Date\(\)\.toISOString\(\),actor_id:w\.id/);
 assert.doesNotMatch(route,/b\.at/);
});


test("general delivery state machine is monotonic and preserves contingency recovery",()=>{
 const start=source.indexOf("const delivery=path.match");
 assert.ok(start>=0,"general delivery route missing");
 const route=source.slice(start,start+3600);
 assert.match(route,/previous===null\?\["DELIVERED","DELIVERY_FAILED"\]/);
 assert.match(route,/previous==="DELIVERY_FAILED"\?\["ALTERNATE_CHANNEL_REQUIRED"\]/);
 assert.match(route,/previous==="ALTERNATE_CHANNEL_REQUIRED"\?\["DELIVERED","DELIVERY_FAILED"\]/);
 assert.match(route,/previous==="DELIVERED"\?\["READ"\]/);
 assert.match(route,/invalid_delivery_transition/);
});
