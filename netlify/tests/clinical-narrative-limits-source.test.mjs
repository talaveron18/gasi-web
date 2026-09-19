import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("short fields keep compact limits while clinical narrative fields allow operational lengths",()=>{
 assert.match(source,/const required=\(v:unknown,name:string,max=160\)=>/);
 assert.match(source,/summary=required\(b\.summary,"summary",5000\)/);
 assert.match(source,/response_text",10000/);
 assert.match(source,/addendum_text",10000/);
 assert.match(source,/replacement_text",10000/);
 assert.match(source,/failure_reason",1000/);
 assert.match(source,/reason",1000/);
});

test("oversized narrative still fails closed with field-specific validation",()=>{
 assert.match(source,/if\(s\.length>max\)throw new Error\(\`\$\{name\}_too_long\`\)/);
 assert.match(source,/code\.endsWith\("_too_long"\).*422/);
});
