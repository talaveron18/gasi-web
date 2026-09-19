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

test("professional attendance UI uses claimed browser cookie and never handles workstation secret",()=>{
 assert.match(attendance,/credentials:'include'/);
 assert.doesNotMatch(attendance,/workstation_credential|enrollment_credential|setCredential|gasi_workstation_id|localStorage/);
 assert.match(attendance,/workstation_binding_required/);
});

test("master workstation UI supports one-time enrollment, claim and reset",()=>{
 assert.match(workstations,/workstation_enrollment_credential/);
 assert.match(workstations,/\/claim`/);
 assert.match(workstations,/enrollment_credential:enrollment/);
 assert.match(workstations,/credentials:'include'/);
 assert.match(workstations,/\/enrollment-reset`/);
 assert.match(workstations,/claimed_at\?'Navegador vinculado':'Pendiente de vincular'/);
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


test("workstation and correction actions prevent duplicate submissions",()=>{
 assert.match(workstations,/\[busy,setBusy\]=useState\(''\)/);
 assert.match(workstations,/if\(busy\)return/);
 assert.match(workstations,/disabled=\{Boolean\(busy\)\}/);
 assert.match(admin,/\[busy,setBusy\]=useState\(false\)/);
 assert.match(admin,/if\(!editing\|\|busy\)return/);
 assert.match(admin,/finally\{setBusy\(false\);\}/);
 assert.match(admin,/disabled=\{busy\}/);
});
