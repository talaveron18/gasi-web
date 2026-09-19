import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../src/pages/InternalClinicalFocusedEpisode.jsx",import.meta.url),"utf8");

test("corrected clinical entries render the latest effective text",()=>{
 assert.match(source,/effectiveText=item\.corrections\?\.length\?item\.corrections\.at\(-1\)\.replacementText:item\.text/);
 assert.match(source,/whitespace-pre-wrap">\{effectiveText\}<\/p>/);
 assert.doesNotMatch(source,/whitespace-pre-wrap">\{item\.text\}<\/p>/);
});

test("correction editor starts from the effective current text",()=>{
 assert.match(source,/useState\(effectiveText\|\|''\)/);
 assert.match(source,/c\.previousText/);
 assert.match(source,/Historial de correcciones/);
});
