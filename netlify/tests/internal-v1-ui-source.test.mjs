import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const profile=fs.readFileSync(new URL("../../frontend/src/pages/InternalProfile.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const authority=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalAuthority.jsx",import.meta.url),"utf8");

test("active internal profile uses authenticated V1 session and canonical routes",()=>{
 assert.match(profile,/Identidad autenticada y alcance operativo vigente/);
 assert.match(profile,/to="\/interno\/clinica"/);
 assert.match(profile,/to="\/interno\/clinica\/nuevo"/);
 assert.doesNotMatch(profile,/internal-prototype|X-Demo-Actor-Id|PROTOTIPO|SINTÉTICO|sintétic/i);
});

test("internal route guard no longer depends on obsolete feature flags",()=>{
 assert.match(app,/function InternalAuthenticated\(\{children\}\)\{const\{isAuthenticated\}=useInternalPrototypeAuth\(\)/);
 assert.doesNotMatch(app,/centralValidationEnabled|validatedId/);
});

test("clinical authority wrapper has no unreachable duplicate implementation",()=>{
 assert.match(authority,/return <InternalClinicalPrototype\/>/);
 assert.doesNotMatch(authority,/centralizedClinicalApiEnabled|CentralClinicalView/);
});
