import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
test("clinical API responses are non-cacheable and MIME-sniff protected",()=>{
 assert.match(source,/"cache-control":"no-store"/);
 assert.match(source,/"x-content-type-options":"nosniff"/);
});
test("clinical API denies framing referrers and unnecessary browser capabilities",()=>{
 assert.match(source,/"x-frame-options":"DENY"/);
 assert.match(source,/"referrer-policy":"no-referrer"/);
 assert.match(source,/"permissions-policy":"camera=\(\), microphone=\(\), geolocation=\(\)"/);
 assert.match(source,/"content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"/);
});
test("all JSON responses share hardened header set",()=>{
 assert.match(source,/new Response\(JSON\.stringify\(body\),\{status,headers:SECURITY_HEADERS\}\)/);
});


test("bounded limit parser rejects NaN and clamps oversized reads",()=>{
 assert.match(source,/const boundedLimit=\(raw:string\|null,fallback:number,max:number\)=>/);
 assert.match(source,/Number\.isSafeInteger\(n\)&&n>0\?Math\.min\(max,n\):fallback/);
 assert.match(source,/boundedLimit\(url\.searchParams\.get\("limit"\),100,250\)/);
 assert.match(source,/boundedLimit\(url\.searchParams\.get\("limit"\),1000,1000\)/);
});


test("malformed JSON is rejected deterministically",()=>{
 assert.match(source,/e instanceof SyntaxError.*invalid_json.*400/);
});
