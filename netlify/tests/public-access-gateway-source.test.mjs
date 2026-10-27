import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const navbar=fs.readFileSync(new URL("../../frontend/src/components/Navbar.jsx",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../../frontend/src/App.js",import.meta.url),"utf8");
const portal=fs.readFileSync(new URL("../../frontend/src/pages/AccessPortal.jsx",import.meta.url),"utf8");
const internal=fs.readFileSync(new URL("../../frontend/src/pages/InternalAccess.jsx",import.meta.url),"utf8");

test("public navigation exposes one generic access entry",()=>{
 assert.match(navbar,/to="\/acceso"/);
 assert.match(navbar,/>\s*Acceder\s*</);
 assert.doesNotMatch(navbar,/Acceder a Formación/);
 assert.match(navbar,/mobile-access-link/);
});

test("generic access gateway separates pre-authorised student and team destinations",()=>{
 assert.match(app,/path="\/acceso".*<AccessPortal\/>/);
 assert.match(portal,/Alumnado/);
 assert.match(portal,/Equipo GASI/);
 assert.match(portal,/to="\/alumnado\/acceso"/);
 assert.match(portal,/data-testid="access-student"/);
 assert.match(portal,/cuenta previamente habilitada por GASI/);
 assert.match(portal,/No existe registro público/);
 assert.match(portal,/to="\/interno\/acceso"/);
 assert.match(portal,/data-testid="access-team"/);
 assert.doesNotMatch(portal,/access-student-disabled/);
 assert.doesNotMatch(portal,/to="\/formacion-sanitaria"/);
});

test("gateway auto-routes only already authenticated sessions without exposing public registration",()=>{
 assert.match(portal,/useAuth\(\)/);
 assert.match(portal,/useInternalPrototypeAuth\(\)/);
 assert.match(portal,/Navigate to="\/dashboard"/);
 assert.match(portal,/Navigate to="\/interno\/clinica"/);
 assert.doesNotMatch(portal,/openAuth/);
 assert.doesNotMatch(portal,/REACT_APP_OAUTH_LOGIN_URL/);
 assert.doesNotMatch(portal,/Registrarse|Crear cuenta|Registro público/i);
});

test("internal login wording is scoped to the GASI team rather than presented as generic public professional access",()=>{
 assert.match(internal,/Acceso al equipo GASI/);
 assert.match(internal,/Identificador de acceso/);
 assert.doesNotMatch(internal,/Acceso profesional/);
});
