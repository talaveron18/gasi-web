import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const apiHelper=fs.readFileSync(new URL("../../frontend/src/lib/publicApi.js",import.meta.url),"utf8");
const auth=fs.readFileSync(new URL("../../frontend/src/contexts/AuthContext.jsx",import.meta.url),"utf8");
const training=fs.readFileSync(new URL("../../frontend/src/pages/FormacionSanitaria.jsx",import.meta.url),"utf8");
const dashboard=fs.readFileSync(new URL("../../frontend/src/pages/Dashboard.jsx",import.meta.url),"utf8");
const course=fs.readFileSync(new URL("../../frontend/src/pages/CursoDetalle.jsx",import.meta.url),"utf8");
const admin=fs.readFileSync(new URL("../../frontend/src/pages/AdminCourses.jsx",import.meta.url),"utf8");
const callback=fs.readFileSync(new URL("../../frontend/src/pages/AuthCallback.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const publicApi=fs.readFileSync(new URL("../functions/public-api.mts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../database/migrations/20260920190000_public-web-v1/migration.sql",import.meta.url),"utf8");

test("public frontend defaults to one same-origin API helper",()=>{
  assert.match(apiHelper,/PUBLIC_API_BASE/);
  assert.match(apiHelper,/configured/);
  assert.match(apiHelper,/\/api/);
  for(const source of [auth,training,dashboard,course,admin,callback]){
    assert.match(source,/PUBLIC_API_BASE as API/);
    assert.doesNotMatch(source,/REACT_APP_BACKEND_URL/);
    assert.doesNotMatch(source,/undefined\/api/);
  }
  assert.doesNotMatch(app,/REACT_APP_BACKEND_URL/);
});

test("training page has no second course administration implementation",()=>{
  assert.doesNotMatch(training,/adminMode|handleCreateCourse|handleDeleteCourse|admin-create-course|admin-edit-/);
  assert.match(training,/\/dashboard\/admin\/cursos/);
  assert.match(training,/data-testid="catalog-admin-link"/);
});

test("public production API is PostgreSQL and same-origin Netlify",()=>{
  assert.match(publicApi,/getDatabase/);
  assert.match(publicApi,/public_users/);
  assert.match(publicApi,/public_courses/);
  assert.match(publicApi,/public_enrollments/);
  assert.match(publicApi,/public_course_materials/);
  assert.doesNotMatch(publicApi,/mongo|motor|mongodb/i);
  assert.match(publicApi,/path:\[/);
  assert.match(publicApi,/"\/api\/auth\/\*"/);
  assert.match(publicApi,/"\/api\/courses\/\*"/);
  assert.doesNotMatch(publicApi,/internal-clinical/);
});

test("public sessions are opaque revocable secure cookies",()=>{
  assert.match(publicApi,/gasi_public_session/);
  assert.match(publicApi,/HttpOnly; Secure; SameSite=Lax/);
  assert.match(publicApi,/token_hash/);
  assert.match(publicApi,/public_sessions/);
  assert.doesNotMatch(publicApi,/jsonwebtoken|JWT_SECRET|Bearer /);
});

test("public privilege escalation is not exposed",()=>{
  assert.match(publicApi,/admin_escalation_disabled/);
  assert.doesNotMatch(training,/make-admin/);
  assert.doesNotMatch(admin,/make-admin/);
});

test("public course data has relational orphan protection",()=>{
  assert.match(migration,/REFERENCES public_users\(id\) ON DELETE RESTRICT/);
  assert.match(migration,/REFERENCES public_courses\(id\) ON DELETE RESTRICT/);
  assert.match(migration,/UNIQUE\(user_id, course_id\)/);
  assert.match(migration,/certificate_id TEXT UNIQUE/);
  assert.match(migration,/content BYTEA NOT NULL/);
});

test("public API keeps paid enrollment behind verified payment",()=>{
  assert.match(publicApi,/payment_required/);
  assert.match(publicApi,/stripeSignature/);
  assert.match(publicApi,/checkout\.session\.completed/);
  assert.match(publicApi,/payment_status!=="paid"/);
  assert.match(publicApi,/public_payment_events/);
});
