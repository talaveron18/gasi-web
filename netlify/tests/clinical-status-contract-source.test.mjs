import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");
const authority=fs.readFileSync(new URL("../../frontend/src/lib/internalClinicalAuthority.js",import.meta.url),"utf8");

test("new clinical episodes use the same pending status contract as the UI",()=>{
 assert.match(api,/INSERT INTO internal_clinical_episodes\(id,tenant_id,center,patient_id,patient_ref,discipline,level,status,document,created_at\)[\s\S]*'ABIERTO'/);
 assert.match(api,/status:"ABIERTO"/);
 assert.doesNotMatch(api,/status:"OPEN"/);
 assert.match(authority,/PENDING_STATUSES = new Set\(\['ABIERTO', 'RESPONDIDO'\]\)/);
});
