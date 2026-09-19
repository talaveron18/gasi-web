import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const newEpisode=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalNewEpisode.jsx",import.meta.url),"utf8");

test("disposition timestamps are validated and normalized before persistence",()=>{
 const start=api.indexOf("const disposition=path.match");
 assert.ok(start>=0);
 const route=api.slice(start,start+3600);
 assert.match(route,/occurredMillis=Date\.parse\(occurredRaw\)/);
 assert.match(route,/invalid_disposition_time/);
 assert.match(route,/new Date\(occurredMillis\)\.toISOString\(\)/);
});

test("new episode UI uses canonical V1 routes and matches backend narrative limit",()=>{
 assert.doesNotMatch(newEpisode,/\/interno\/prototipo-clinico/);
 assert.match(newEpisode,/to="\/interno\/clinica"/);
 assert.match(newEpisode,/\/interno\/clinica\/caso\//);
 assert.match(newEpisode,/maxLength=\{5000\}/);
});
