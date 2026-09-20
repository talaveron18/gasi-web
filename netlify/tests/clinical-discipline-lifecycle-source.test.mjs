import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const actions=fs.readFileSync(new URL("../../frontend/src/components/InternalClinicalEpisodeActions.jsx",import.meta.url),"utf8");

test("professional response roles cover physician psychology and physiotherapy but not nursing authoring",()=>{
 const start=api.indexOf("const responseMatch=path.match");
 const route=api.slice(start,start+2800);
 assert.match(route,/\["physician","psychologist","physiotherapist"\]\.includes\(w\.role\)/);
 assert.match(route,/response_role_required/);
 assert.match(actions,/\['physician','psychologist','physiotherapist'\]\.includes\(session\.role\)/);
});

test("N1 N2 N3 changes are rejected outside nursing episodes",()=>{
 const start=api.indexOf("const levelMatch=path.match");
 const route=api.slice(start,start+2600);
 assert.match(route,/e\.discipline!=="nursing"/);
 assert.match(route,/level_not_applicable/);
 assert.match(actions,/episode\.discipline==='nursing'/);
});
