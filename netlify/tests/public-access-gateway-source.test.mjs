import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const navbar=fs.readFileSync(new URL("../../frontend/src/components/Navbar.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const portal=fs.readFileSync(new URL("../../frontend/src/pages/AccessPortal.jsx",import.meta.url),"utf8");
const training=fs.readFileSync(new URL("../../frontend/src/pages/FormacionSanitaria.jsx",import.meta.url),"utf8");
const internal=fs.readFileSync(new URL("../../frontend/src/pages/InternalAccess.jsx",import.meta.url),"utf8");

test("public navigation exposes one generic access entry",()=>{
 assert.match(navbar,/to="\/acceso"/);
 assert.match(navbar,/>\s*Acceder\s*</);
 assert.doesNotMatch(navbar,/Acceder a Formación/);
 assert.match(navbar,/mobile-access-link/);
});

test("generic access gateway separates student and authorised team destinations",()=>{
 assert.match(app,/path="\/acceso".*<AccessPortal\/>/);
 assert.match(portal,/Alumnado/);
 assert.match(portal,/Equipo GASI/);
 assert.match(portal,/to="\/formacion-sanitaria"/);
 assert.match(portal,/state=\{\{ openAuth: true \}\}/);
 assert.match(portal,/to="\/interno\/acceso"/);
});

test("gateway reuses established authentication systems and auto-routes active sessions",()=>{
 assert.match(portal,/useAuth\(\)/);
 assert.match(portal,/useInternalPrototypeAuth\(\)/);
 assert.match(portal,/Navigate to="\/dashboard"/);
 assert.match(portal,/Navigate to="\/interno\/clinica"/);
 assert.match(training,/location\.state\?\.openAuth/);
});

test("internal login wording is scoped to the GASI team rather than presented as generic public professional access",()=>{
 assert.match(internal,/Acceso al equipo GASI/);
 assert.match(internal,/Identificador de acceso/);
 assert.doesNotMatch(internal,/Acceso profesional/);
});
