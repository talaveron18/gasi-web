import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
test("internal login throttles repeated failures without exposing account existence",()=>{
 assert.match(source,/v\.count>=8/);
 assert.match(source,/resetAt:now\+15\*60_000/);
 assert.match(source,/too_many_login_attempts.*429/);
 assert.match(source,/invalid_credentials.*401/);
 assert.doesNotMatch(source,/user_not_found|worker_not_found.*invalid_credentials/);
});
test("successful authentication clears the failure bucket",()=>{
 assert.match(source,/loginSucceeded\(key\)/);
 assert.match(source,/loginAttempts\.delete\(key\)/);
});
