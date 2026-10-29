import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const publicSurfaces = [
  'frontend/public/index.html',
  'frontend/src/App.js',
  'frontend/src/components/Navbar.jsx',
  'frontend/src/components/Footer.jsx',
  'frontend/src/components/Chatbot.jsx',
  'frontend/src/pages/Home.jsx',
  'frontend/src/pages/QuienesSomos.jsx',
  'frontend/src/pages/Servicios.jsx',
  'frontend/src/pages/CoberturaSanitaria.jsx',
  'frontend/src/pages/FormacionSanitaria.jsx',
  'frontend/src/pages/SaludLaboral.jsx',
  'frontend/src/pages/Sectores.jsx',
  'frontend/src/pages/Contacto.jsx',
  'frontend/src/pages/PoliticaPrivacidad.jsx',
  'frontend/src/pages/NotFound.jsx',
  'frontend/src/pages/AccessPortal.jsx',
  'frontend/src/pages/StudentAccess.jsx',
  'frontend/functions/chatbot.js',
  'frontend/functions/contact.js',
  'netlify/functions/chatbot.js',
  'netlify/functions/contact.js',
  'netlify/functions/public-lead-utils.js',
];

const forbiddenPromises = [
  /fisioterapia/i,
  /psicolog[ií]a/i,
  /apoyo\s+m[eé]dico\s+remoto/i,
  /telemedicina/i,
];

test('public copy does not advertise withdrawn or unverified services', () => {
  const violations = [];
  for (const file of publicSurfaces) {
    const source = read(file);
    for (const pattern of forbiddenPromises) {
      if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
    }
  }
  assert.deepEqual(violations, []);
});

test('recognition-medical wording is exclusionary, never an advertised service', () => {
  const occurrences = publicSurfaces.filter((file) => /reconocimientos?\s+m[eé]dicos?/i.test(read(file)));
  assert.ok(occurrences.length > 0, 'expected an explicit public exclusion');
  for (const file of occurrences) {
    const source = read(file);
    assert.match(source, /(?:no incluye|no realizamos|no ofrece)[\s\S]{0,120}reconocimientos?\s+m[eé]dicos?/i, file);
  }
});

test('public lead handlers accept only the reconciled commercial service vocabulary', () => {
  const expected = ['Enfermería presencial', 'Formación sanitaria', 'Otro'];
  for (const file of ['frontend/functions/chatbot.js', 'netlify/functions/public-lead-utils.js']) {
    const source = read(file);
    for (const service of expected) assert.ok(source.includes(service), `${file}: missing ${service}`);
    assert.doesNotMatch(source, /Reconocimientos? médicos/i, file);
  }
});

test('all public offer pages name only the current offer and delimit scope', () => {
  const bothOfferPages = [
    'frontend/src/pages/Home.jsx',
    'frontend/src/pages/Servicios.jsx',
    'frontend/src/pages/QuienesSomos.jsx',
    'frontend/src/pages/SaludLaboral.jsx',
    'frontend/src/pages/Sectores.jsx',
  ];
  for (const file of bothOfferPages) {
    const source = read(file);
    assert.match(source, /enfermer[ií]a presencial/i, `${file}: missing nursing offer`);
    assert.match(source, /formaci[oó]n sanitaria/i, `${file}: missing training offer`);
    assert.match(source, /alcance|requisitos aplicables|confirmaci[oó]n previa/i, `${file}: missing scope limitation`);
  }

  const nursing = read('frontend/src/pages/CoberturaSanitaria.jsx');
  assert.match(nursing, /enfermer[ií]a presencial/i);
  assert.match(nursing, /alcance aplicable|alcance previamente|confirmaremos primero/i);

  const training = read('frontend/src/pages/FormacionSanitaria.jsx');
  assert.match(training, /formaci[oó]n sanitaria/i);
  assert.match(training, /alcance|disponibilidad|confirmaci[oó]n/i);

  const index = read('frontend/public/index.html');
  assert.match(index, /enfermer[ií]a presencial/i);
  assert.match(index, /formaci[oó]n sanitaria/i);
  assert.match(index, /sujetas a confirmaci[oó]n previa de alcance y requisitos aplicables/i);
});

test('public navigation exposes only reconciled service destinations', () => {
  const nav = read('frontend/src/components/Navbar.jsx');
  assert.match(nav, /\/cobertura-sanitaria/);
  assert.match(nav, /\/formacion-sanitaria/);
  assert.doesNotMatch(nav, /nav-health-services/);
});

test('public router cannot expose the withdrawn course catalogue/detail surfaces', () => {
  const app = read('frontend/src/App.js');
  assert.match(app, /path="\/curso\/:courseId"\s+element=\{<Navigate\s+to="\/formacion-sanitaria"\s+replace\/>\}/);
  assert.match(app, /path="\/dashboard\/admin\/cursos"\s+element=\{<Navigate\s+to="\/acceso"\s+replace\/>\}/);
  assert.doesNotMatch(app, /<Route\s+path="\/curso\/:courseId"\s+element=\{<CursoDetalle/);
  assert.doesNotMatch(app, /<Route\s+path="\/dashboard\/admin\/cursos"\s+element=\{<AdminCourses/);
});

test('public access gateway is non-commercial and does not imply open registration or availability', () => {
  const portal = read('frontend/src/pages/AccessPortal.jsx');
  const student = read('frontend/src/pages/StudentAccess.jsx');
  assert.match(portal, /Acceso restringido/);
  assert.match(portal, /No existe registro público/);
  assert.match(portal, /previamente autorizados/);
  assert.match(student, /Área reservada/);
  assert.match(student, /No se permite el registro público/);
  for (const source of [portal, student]) {
    assert.doesNotMatch(source, /contrata|comprar|precio|disponible para todos|registro abierto/i);
  }
});

test('public course catalogue and course detail stay blocked at edge routing', () => {
  const config = read('netlify.toml');
  assert.match(config, /from\s*=\s*"\/api\/courses\/"[\s\S]*?status\s*=\s*404[\s\S]*?force\s*=\s*true/);
  assert.match(config, /from\s*=\s*"\/api\/courses\/:course_id"[\s\S]*?status\s*=\s*404[\s\S]*?force\s*=\s*true/);
});

test('public contact surfaces explicitly delimit non-clinical channels', () => {
  assert.match(read('frontend/src/components/Chatbot.jsx'), /No es un canal cl[ií]nico ni de urgencias/i);
  assert.match(read('frontend/src/components/Footer.jsx'), /No son canales cl[ií]nicos ni de urgencias/i);
  assert.match(read('frontend/src/pages/Contacto.jsx'), /no (?:es|son) (?:un )?canal(?:es)? cl[ií]nico(?:s)? ni de urgencias/i);
  assert.match(read('frontend/functions/chatbot.js'), /Canal exclusivamente comercial\. No admite contenido clínico ni urgencias/i);
  assert.match(read('netlify/functions/chatbot.js'), /no admite contenido clínico ni datos de salud/i);
});
