import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920190000_public-web-v1/migration.sql",import.meta.url),"utf8");

test("course materials never fall back to public local uploads",()=>{
  assert.equal(api.includes("/app/uploads"),false);
  assert.equal(api.includes("/uploads/courses"),false);
  assert.equal(api.includes("COURSE_MATERIAL_BUCKET"),false);
  assert.equal(api.includes("object_key"),false);
  assert.equal(migration.includes("content BYTEA NOT NULL"),true);
});

test("public material metadata omits binary content",()=>{
  assert.equal(api.includes("SELECT material_id,course_id,module_id,filename,content_type,size_bytes AS size,created_at,status FROM public_course_materials"),true);
  assert.equal(api.includes("SELECT * FROM public_course_materials WHERE course_id"),false);
});

test("course material content is authorized and private",()=>{
  assert.equal(api.includes("courseAccess(client,user,courseId)"),true);
  assert.equal(api.includes("course_access_required"),true);
  assert.equal(api.includes("private, no-store"),true);
  assert.equal(api.includes("material_id=$1 AND course_id=$2"),true);
});

test("admin PDF upload validates extension signature and size",()=>{
  assert.equal(api.includes("MAX_PDF_BYTES"),true);
  assert.equal(api.includes("endsWith(\".pdf\")"),true);
  assert.equal(api.includes("Buffer.from(\"%PDF-\")"),true);
  assert.equal(api.includes("INSERT INTO public_course_materials"),true);
});
