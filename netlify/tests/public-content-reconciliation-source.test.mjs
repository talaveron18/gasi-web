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

test('home, services and SEO identify the current offer explicitly', () => {
  const home = read('frontend/src/pages/Home.jsx');
  const services = read('frontend/src/pages/Servicios.jsx');
  const index = read('frontend/public/index.html');
  for (const source of [home, services, index]) {
    assert.match(source, /[Ee]nfermer[ií]a [Pp]resencial/);
    assert.match(source, /[Ff]ormaci[oó]n [Ss]anitaria/);
  }
  assert.match(home, /sujetas? a confirmaci[oó]n|se confirma|requisitos aplicables/i);
  assert.match(services, /requisitos aplicables/i);
  assert.match(index, /sujetas a confirmaci[oó]n previa de alcance y requisitos aplicables/i);
});

test('public navigation exposes only reconciled service destinations', () => {
  const nav = read('frontend/src/components/Navbar.jsx');
  assert.match(nav, /\/cobertura-sanitaria/);
  assert.match(nav, /\/formacion-sanitaria/);
  assert.doesNotMatch(nav, /nav-health-services/);
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
