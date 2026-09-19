import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("database client factory is cached per connection string instead of recreated per request",()=>{
 assert.match(source,/const databaseCache=new Map<string,any>\(\)/);
 assert.match(source,/if\(!databaseCache\.has\(key\)\)databaseCache\.set\(key,connectionString\?getDatabase\(\{connectionString\}\):getDatabase\(\)\)/);
 assert.match(source,/const db=database\(\)/);
 assert.doesNotMatch(source,/const db=connectionString\?getDatabase\(\{connectionString\}\):getDatabase\(\)/);
});
