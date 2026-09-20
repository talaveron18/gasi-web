import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const toml=fs.readFileSync(new URL("../../netlify.toml",import.meta.url),"utf8");

test("static Netlify responses keep baseline browser hardening",()=>{
  assert.match(toml,/for = "\/\*"/);
  assert.match(toml,/X-Content-Type-Options = "nosniff"/);
  assert.match(toml,/Referrer-Policy = "no-referrer"/);
  assert.match(toml,/X-Frame-Options = "DENY"/);
  assert.match(toml,/Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\)"/);
  assert.match(toml,/Strict-Transport-Security = "max-age=31536000; includeSubDomains"/);
});

test("SPA shell is revalidated while fingerprinted static assets are immutable",()=>{
  assert.match(toml,/Cache-Control = "no-cache"/);
  assert.match(toml,/for = "\/static\/\*"[\s\S]*Cache-Control = "public, max-age=31536000, immutable"/);
});
