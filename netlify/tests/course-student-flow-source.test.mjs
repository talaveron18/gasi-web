import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail=fs.readFileSync(new URL("../../frontend/src/pages/CursoDetalle.jsx",import.meta.url),"utf8");

test("paid courses route through authenticated checkout instead of direct enrollment",()=>{
  assert.match(detail,/if \(course\.is_free\)[\s\S]*courses\/enroll[\s\S]*else[\s\S]*payments\/create-checkout/);
  assert.match(detail,/withCredentials:\s*true/);
  assert.match(detail,/window\.location\.assign\(response\.data\.checkout_url\)/);
});

test("private materials require authenticated API calls and blob rendering",()=>{
  assert.match(detail,/courses\/\$\{courseId\}\/materials/);
  assert.match(detail,/responseType:\s*'blob'/);
  assert.match(detail,/URL\.createObjectURL/);
  assert.match(detail,/withCredentials:\s*true/);
  assert.match(detail,/data-testid="course-materials"/);
  assert.match(detail,/Abrir material/);
});

test("course UI does not expose backend object keys or public material URLs",()=>{
  assert.doesNotMatch(detail,/object_key|\/uploads\/courses|COURSE_MATERIAL_BUCKET/);
  assert.doesNotMatch(detail,/download=/);
  assert.match(detail,/La web no publica un enlace directo al archivo/);
});

test("revoked or forbidden material access clears course access state",()=>{
  assert.match(detail,/error\.response\?\.status === 403 \|\| error\.response\?\.status === 401/);
  assert.match(detail,/setHasCourseAccess\(false\)/);
  assert.match(detail,/setMaterials\(\[\]\)/);
});
