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


test("episode UI can review late responses, advance delivery evidence and close with backend gates",()=>{
 assert.match(actions,/api\.reviewLateResponse\(episode\.id,responseId\)/);
 assert.match(actions,/api\.advanceMessage\(episode\.id,latestResponse\.id,kind\)/);
 assert.match(actions,/api\.closeEpisode\(episode\.id,\{follow_up_pending:!noFollowUp,handoff_required:handoffRequired,handoff_acknowledged:handoffAcknowledged,acknowledgement_required:acknowledgementRequired\}\)/);
 assert.match(actions,/pendingLate\.length===0/);
 assert.match(actions,/latestResponse\?\.status==='LEIDA'/);
 assert.match(actions,/no se permite autorrevisión/);
});
