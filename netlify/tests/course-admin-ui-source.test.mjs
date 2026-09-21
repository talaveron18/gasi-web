import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const dashboard=fs.readFileSync(new URL("../../frontend/src/pages/Dashboard.jsx",import.meta.url),"utf8");
const admin=fs.readFileSync(new URL("../../frontend/src/pages/AdminCourses.jsx",import.meta.url),"utf8");
const api=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920190000_public-web-v1/migration.sql",import.meta.url),"utf8");

test("course administration route requires authenticated public admin",()=>{
  assert.match(app,/function PublicAdminRoute\(\)/);
  assert.match(app,/if\(!user\.is_admin\)return <Navigate to="\/dashboard" replace\/>/);
  assert.match(app,/path="\/dashboard\/admin\/cursos"/);
  assert.match(dashboard,/user\.is_admin &&/);
  assert.match(dashboard,/data-testid="admin-courses-link"/);
});

test("admin UI uses credentialed safe course and material endpoints",()=>{
  assert.match(admin,/admin\/courses\/\$\{selectedId\}\/materials/);
  assert.match(admin,/withCredentials:\s*true/g);
  assert.match(admin,/module_has_materials/);
  assert.match(admin,/course_has_enrollments/);
  assert.match(admin,/course_has_materials/);
});

test("admin UI never exposes private storage keys",()=>{
  assert.doesNotMatch(admin,/object_key|COURSE_MATERIAL_BUCKET|\/app\/uploads/);
  assert.match(admin,/Subir PDF/);
  assert.match(admin,/Materiales publicados/);
});

test("production API blocks destructive administration that would orphan dependencies",()=>{
  assert.match(api,/module_has_materials/);
  assert.match(api,/course_has_enrollments/);
  assert.match(api,/course_has_materials/);
  assert.match(migration,/REFERENCES public_courses\(id\) ON DELETE RESTRICT/);
  assert.match(migration,/REFERENCES public_users\(id\) ON DELETE RESTRICT/);
});
