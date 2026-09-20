import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const admin=fs.readFileSync(new URL("../../backend/routes/admin.py",import.meta.url),"utf8");
const courses=fs.readFileSync(new URL("../../backend/routes/courses.py",import.meta.url),"utf8");
const models=fs.readFileSync(new URL("../../backend/models.py",import.meta.url),"utf8");
const storage=fs.readFileSync(new URL("../../backend/course_material_storage.py",import.meta.url),"utf8");

test("course materials never fall back to local public uploads",()=>{
  const joined=admin+"\n"+courses+"\n"+storage;
  assert.doesNotMatch(joined,/\/app\/uploads|\/uploads\/courses/);
  assert.match(storage,/COURSE_MATERIAL_BUCKET/);
  assert.match(storage,/course_material_storage_not_configured/);
});

test("public course schema does not expose storage references",()=>{
  assert.doesNotMatch(models,/pdfs:\s*List\[str\]/);
  assert.doesNotMatch(models,/videos:\s*List\[str\]/);
  assert.match(courses,/object_key": 0/);
  assert.match(courses,/created_by": 0/);
});

test("course material content is authorized and private",()=>{
  assert.match(courses,/require_course_access/);
  assert.match(courses,/course_access_required/);
  assert.match(courses,/Cache-Control": "private, no-store"/);
  assert.match(courses,/Content-Disposition": f'inline;/);
  assert.match(courses,/material_id": material_id, "course_id": course_id/);
});

test("admin PDF upload validates signature and private storage",()=>{
  assert.match(admin,/content\.startswith\(b"%PDF-"\)/);
  assert.match(admin,/MAX_PDF_BYTES/);
  assert.match(admin,/get_course_material_storage\(\)/);
  assert.doesNotMatch(admin,/return \{[^}]*"url"/s);
});
