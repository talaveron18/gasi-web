import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync(new URL("../../frontend/src/pages/InternalRecovery.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const profile=fs.readFileSync(new URL("../../frontend/src/pages/InternalProfile.jsx",import.meta.url),"utf8");
const clinical=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalPrototype.jsx",import.meta.url),"utf8");

test("recovery console is authenticated and master-gated",()=>{
 assert.match(app,/path="\/interno\/recuperacion" element=\{<Guard><InternalRecovery\/><\/Guard>\}/);
 assert.match(page,/if\(!isMaster\)return/);
 assert.match(profile,/to="\/interno\/recuperacion"/);
 assert.match(clinical,/isMaster&&<Link to="\/interno\/recuperacion"/);
});

test("recovery export downloads the server-signed snapshot without persisting it in browser storage",()=>{
 assert.match(page,/\/api\/internal-clinical\/recovery\/snapshot/);
 assert.match(page,/new Blob\(\[JSON\.stringify\(data,null,2\)\]/);
 assert.match(page,/snapshot_signature/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|indexedDB/);
});

test("destructive restore requires signed V2 file and explicit typed confirmation",()=>{
 assert.match(page,/const CONFIRM='RESTAURAR'/);
 assert.match(page,/schema_version!==2/);
 assert.match(page,/snapshot_signature/);
 assert.match(page,/confirm!==CONFIRM/);
 assert.match(page,/\/api\/internal-clinical\/recovery\/restore/);
 assert.match(page,/Restaurar estado completo/);
});
