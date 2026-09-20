import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const queue=fs.readFileSync(new URL("../../frontend/src/components/InternalClinicalEpisodeQueue.jsx",import.meta.url),"utf8");
const actions=fs.readFileSync(new URL("../../frontend/src/components/InternalClinicalEpisodeActions.jsx",import.meta.url),"utf8");
const newEpisode=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalNewEpisode.jsx",import.meta.url),"utf8");
const focused=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalFocusedEpisode.jsx",import.meta.url),"utf8");

test("clinical queue exposes keyboard focus and selection semantics",()=>{
 assert.match(queue,/aria-pressed=\{episode\.id === selectedId\}/);
 assert.match(queue,/aria-label=\{\`Episodio /);
 assert.match(queue,/focus-visible:ring-2/);
 assert.match(queue,/role="list"/);
});

test("clinical actions expose visible focus live state and explicit closure confirmation",()=>{
 assert.match(actions,/confirmClinicalEpisodeClosure/);
 assert.match(actions,/window\.confirm/);
 assert.match(actions,/aria-busy=\{Boolean\(busy\)\}/);
 assert.match(actions,/role=\{messageIsError\?'alert':'status'\}/);
 assert.match(actions,/aria-live=\{messageIsError\?'assertive':'polite'\}/);
 assert.match(actions,/focus-visible:ring-2/);
});

test("new episode workflow exposes busy state, keyboard focus and live creation status",()=>{
 assert.match(newEpisode,/aria-busy=\{state === 'SAVING'\}/);
 assert.match(newEpisode,/aria-describedby="clinical-level-help"/);
 assert.match(newEpisode,/aria-live="polite"/);
 assert.match(newEpisode,/focus-visible:ring-2/);
});

test("focused episode preserves accessible correction and privileged-read interactions",()=>{
 assert.match(focused,/role="alert"/);
 assert.match(focused,/aria-busy=\{accessBusy\}/);
 assert.match(focused,/focus-visible:ring-2/);
 assert.match(focused,/ACCESO CLÍNICO EXCEPCIONAL · SOLO LECTURA/);
});
