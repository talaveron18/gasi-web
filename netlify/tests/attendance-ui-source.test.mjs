import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const attendance=fs.readFileSync(new URL("../../frontend/src/pages/InternalAttendance.jsx",import.meta.url),"utf8");
const workstations=fs.readFileSync(new URL("../../frontend/src/pages/InternalWorkstations.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const admin=fs.readFileSync(new URL("../../frontend/src/pages/InternalAttendanceAdmin.jsx",import.meta.url),"utf8");

test("attendance UI renders corrected effective values while preserving original details",()=>{
 assert.match(attendance,/effectiveAttendance=\(events=\[\]\)=>/);
 assert.match(attendance,/e\.event_type==='CORRECTION'&&e\.related_event_seq!=null/);
 assert.match(attendance,/corrected_event_type\|\|e\.event_type/);
 assert.match(attendance,/corrected_occurred_at\|\|e\.occurred_at/);
 assert.match(attendance,/Original:/);
 assert.match(attendance,/Motivo:/);
});

test("workstation credential is not persisted by the attendance UI",()=>{
 assert.match(attendance,/localStorage\.getItem\('gasi_workstation_id'\)/);
 assert.match(attendance,/localStorage\.setItem\('gasi_workstation_id',workstationId\)/);
 assert.doesNotMatch(attendance,/localStorage\.(?:setItem|getItem)\(['\"][^'\"]*credential/i);
});

test("attendance and workstation management routes remain authenticated",()=>{
 assert.match(app,/path="\/interno\/fichaje" element=\{<Guard><InternalAttendance\/><\/Guard>\}/);
 assert.match(app,/path="\/interno\/puestos" element=\{<Guard><InternalWorkstations\/><\/Guard>\}/);
 assert.match(workstations,/if\(!isMaster\)return/);
 assert.match(attendance,/if\(session\.role==='admin'\)return/);
});


test("master attendance control is guarded and submits append-only corrections",()=>{
 assert.match(app,/path="\/interno\/fichajes" element=\{<Guard><InternalAttendanceAdmin\/><\/Guard>\}/);
 assert.match(admin,/if\(!isMaster\)return/);
 assert.match(admin,/attendance\?limit=250/);
 assert.match(admin,/\/attendance\/\$\{editing\}\/correct/);
 assert.match(admin,/corrected_event_type:form\.event_type/);
 assert.match(admin,/corrected_occurred_at:corrected\.toISOString\(\)/);
 assert.match(admin,/reason:form\.reason/);
 assert.match(admin,/Corrección registrada sin modificar el evento original/);
});
