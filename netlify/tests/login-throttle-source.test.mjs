import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260919212000_internal-login-throttle/migration.sql",import.meta.url),"utf8");

test("internal login throttle is shared in database and does not expose account existence",()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS internal_login_throttle/);
 assert.match(source,/SELECT failures,window_started_at,blocked_until FROM internal_login_throttle/);
 assert.match(source,/pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
 assert.match(source,/next>=Number\(bucket\.limit\)\?new Date\(now\+15\*60_000\):null/);
 assert.match(source,/too_many_login_attempts.*429/);
 assert.match(source,/invalid_credentials.*401/);
 assert.doesNotMatch(source,/user_not_found|worker_not_found.*invalid_credentials/);
});

test("login throttle uses hashed pair and shared IP buckets",()=>{
 assert.match(source,/x-nf-client-connection-ip/);
 assert.match(source,/pair:\$\{source\}:\$\{id\}/);
 assert.match(source,/ip:\$\{source\}/);
 assert.match(source,/limit:8,scope:"pair"/);
 assert.match(source,/limit:40,scope:"ip"/);
 assert.match(source,/crypto\.createHash\("sha256"\)\.update\(raw\)\.digest\("hex"\)/);
 assert.doesNotMatch(migration,/client_ip|worker_id/);
});

test("successful authentication clears only the account-pair bucket",()=>{
 assert.match(source,/const pair=buckets\.find\(\(x:any\)=>x\.scope==="pair"\)/);
 assert.match(source,/DELETE FROM internal_login_throttle WHERE key_hash=/);
 assert.doesNotMatch(source,/loginSucceeded[\s\S]*scope==="ip"/);
});


test("session TTL falls back safely on invalid environment values",()=>{
 assert.match(source,/const sessionTtlMinutes=\(\)=>\{const n=Number\(env\("GASI_INTERNAL_SESSION_TTL_MINUTES"\)\);return Number\.isSafeInteger\(n\)&&n>=1&&n<=480\?n:30;\}/);
 assert.match(source,/const ttl=sessionTtlMinutes\(\)/);
});


test("signed session token parsing is strict",()=>{
 assert.match(source,/const parts=token\.split\("\."\);if\(parts\.length!==3\)throw new Error\("invalid_session_token"\)/);
 assert.match(source,/catch\{throw new Error\("invalid_session_token"\);\}/);
 assert.match(source,/typeof p\.sub!=="string"/);
 assert.match(source,/typeof p\.sid!=="string"/);
 assert.match(source,/Number\.isSafeInteger\(Number\(p\.exp\)\)/);
 assert.match(source,/Number\(p\.exp\)<=Number\(p\.iat\)/);
});


test("stale throttle rows are pruned using the indexed updated_at column",()=>{
 assert.match(migration,/internal_login_throttle_updated_at_idx/);
 assert.match(source,/DELETE FROM internal_login_throttle WHERE updated_at < NOW\(\) - INTERVAL '1 day'/);
 assert.match(source,/await pruneLoginThrottle\(db\)/);
});
