'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicFiles = [
  'src/pages/Home.jsx',
  'src/pages/QuienesSomos.jsx',
  'src/pages/Servicios.jsx',
  'src/pages/CoberturaSanitaria.jsx',
  'src/pages/FormacionSanitaria.jsx',
  'src/pages/SaludLaboral.jsx',
  'src/pages/Sectores.jsx',
  'src/pages/Contacto.jsx',
  'src/pages/PoliticaPrivacidad.jsx',
  'src/components/Navbar.jsx',
  'src/components/Footer.jsx',
  'src/components/Chatbot.jsx',
  'public/index.html'
];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('inventario de superficies comerciales existe y no promete reconocimientos médicos', () => {
  const claims = [
    /(?:ofrecemos|realizamos|prestamos|contrata|reserva|incluye)\s+(?:\w+\s+){0,5}reconocimientos?\s+m[eé]dicos?/i,
    /(?:certificaci[oó]n|acreditaci[oó]n)\s+garantizada/i,
    /(?:disponibilidad|atenci[oó]n)\s+garantizada\s+(?:24\s*\/\s*7|inmediata)/i
  ];
  for (const file of publicFiles) {
    const source = read(file);
    assert.ok(source.trim(), `${file}: contenido vacío`);
    for (const claim of claims) assert.doesNotMatch(source, claim, `${file}: promesa no acreditada`);
  }
});

test('las rutas comerciales previstas están registradas', () => {
  const app = read('src/App.js');
  for (const route of [
    '/', '/quienes-somos', '/servicios', '/cobertura-sanitaria',
    '/formacion-sanitaria', '/servicios-sanitarios-organizaciones',
    '/sectores', '/contacto', '/politica-privacidad'
  ]) assert.ok(app.includes(`path="${route}"`), `Ruta ausente: ${route}`);
  assert.match(app, /path="\/curso\/:courseId"[^\n]*\/formacion-sanitaria/);
});

test('captación comercial sin promesas de contratación o entrega confirmada', () => {
  const contact = read('src/pages/Contacto.jsx');
  const bot = read('src/components/Chatbot.jsx');
  for (const source of [contact, bot]) {
    assert.match(source, /coordinacion@gasisalud\.com/);
    assert.match(source, /no (?:es un canal clínico ni de urgencias|confirma su entrega al buzón)/i);
  }
  assert.match(contact, /no confirma su entrega al buzón/i);
  assert.match(bot, /no confirma su entrega al buzón/i);
});

test('metadatos públicos limitados a la oferta prudente', () => {
  const html = read('public/index.html');
  assert.match(html, /Enfermería presencial y formación sanitaria/i);
  assert.match(html, /confirmación previa de alcance/i);
});

test('navegación y CTA comerciales no enlazan a compra, inscripción o servicios heredados', () => {
  const app = read('src/App.js');
  const sources = [
    'src/pages/Home.jsx',
    'src/pages/Servicios.jsx',
    'src/pages/CoberturaSanitaria.jsx',
    'src/pages/FormacionSanitaria.jsx',
    'src/pages/SaludLaboral.jsx',
    'src/pages/Sectores.jsx',
    'src/components/Navbar.jsx',
    'src/components/Footer.jsx'
  ];
  const forbidden = /\/(?:curso\/|checkout\b|pagos?\b|inscripciones?\b|reconocimientos-medicos\b)/i;
  for (const file of sources) {
    const source = read(file);
    assert.doesNotMatch(source, forbidden, `${file}: enlace comercial heredado`);
    for (const match of source.matchAll(/<Link\b[^>]*\bto="(\/[^"]*)"/g)) {
      const route = match[1];
      assert.ok(app.includes(`path="${route}"`), `${file}: CTA apunta a ruta sin registrar ${route}`);
    }
  }
  assert.match(app, /path="\/curso\/:courseId"[^\n]*<Navigate to="\/formacion-sanitaria" replace\/>/);
});


test('la portada no depende de imágenes externas no verificadas', () => {
  const home = read('src/pages/Home.jsx');
  assert.doesNotMatch(home, /customer-assets\.emergentagent\.com|service\.image|<img\b/i);
  assert.match(home, /bg-gradient-to-br/);
});


test('el pie de página no depende de un logo alojado fuera de GASI', () => {
  const footer = read('src/components/Footer.jsx');
  assert.doesNotMatch(footer, /customer-assets\.emergentagent\.com|<img\b/i);
  assert.match(footer, /aria-label="GASI - Grupo de Asistencia Sanitaria Integral"/);
});


test('la navegación no depende de un logotipo alojado en terceros', () => {
  const navbar = read('src/components/Navbar.jsx');
  assert.doesNotMatch(navbar, /customer-assets\.emergentagent\.com|<img\b/i);
  assert.match(navbar, /aria-label="GASI - Grupo de Asistencia Sanitaria Integral"/);
});


test('el chatbot comprueba el consentimiento vigente al enviar, sin fijarlo artificialmente', () => {
  const chatbot = read('src/components/Chatbot.jsx');
  assert.match(chatbot, /if\(!acceptsPrivacy\)\{addBot\('Debes aceptar la política de protección de datos antes de enviar la solicitud\.'\);return;\}/);
  assert.match(chatbot, /accepts_privacy:acceptsPrivacy/);
  assert.doesNotMatch(chatbot, /accepts_privacy:true/);
});
