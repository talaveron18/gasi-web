import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const actions=fs.readFileSync(new URL("../../frontend/src/components/InternalClinicalEpisodeActions.jsx",import.meta.url),"utf8");
const focused=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalFocusedEpisode.jsx",import.meta.url),"utf8");

test("episode UI exposes physician response and clinical addendum through authoritative API",()=>{
 assert.match(actions,/session\.role==='physician'/);
 assert.match(actions,/api\.respond\(episode\.id,text\)/);
 assert.match(actions,/api\.addAddendum\(episode\.id,text\)/);
 assert.match(actions,/onUpdate\(updated\)/);
 assert.match(focused,/InternalClinicalEpisodeActions/);
 assert.match(focused,/onUpdate=\{setEpisode\}/);
});

test("episode actions mirror server write scope and stay disabled for closed or privileged read-only views",()=>{
 assert.match(actions,/session\.role!=='admin'/);
 assert.match(actions,/session\.centers\.includes\(episode\.center\)/);
 assert.match(actions,/disciplineFor\(session\.role\)===episode\.discipline/);
 assert.match(actions,/episode\.status==='CERRADO'/);
 assert.match(actions,/readOnly=false/);
 assert.match(focused,/showNarrative&&!privileged&&<InternalClinicalEpisodeActions/);
});
