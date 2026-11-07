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
    assert.match(source, /(?:no es un canal clínico ni de urgencias|no confirma (?:su |la )?entrega al buzón)/i);
  }
  assert.match(contact, /no confirma (?:su |la )?entrega al buzón/i);
  assert.match(bot, /no confirma su entrega al buzón/i);
  assert.match(bot, /El servicio de envío ha aceptado tu solicitud/);
  assert.doesNotMatch(bot, /Tu solicitud se ha enviado al servicio de recepción/);
});

test('metadatos públicos limitados a la oferta prudente', () => {
  const html = read('public/index.html');
  assert.match(html, /Asistencia Sanitaria Integral para Empresas/i);
  assert.match(html, /primeros auxilios, RCP y desfibriladores/i);
  assert.match(html, /alcance y requisitos aplicables/i);
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


test('la portada presenta el nuevo posicionamiento y las dos líneas comerciales', () => {
  const home = read('src/pages/Home.jsx');
  assert.doesNotMatch(home, /customer-assets\.emergentagent\.com/i);
  assert.match(home, /Asistencia Sanitaria Integral para Empresas/);
  assert.match(home, /title: 'Asistencia Sanitaria Integral'/);
  assert.match(home, /Formación Sanitaria/);
  assert.match(home, /service\.image/);
  assert.match(home, /<img\b/);
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

test('páginas comerciales mantienen asistencia integral, formación empresarial y excluyen venta de DEA', () => {
  const about = read('src/pages/QuienesSomos.jsx');
  const services = read('src/pages/Servicios.jsx');
  const healthcare = read('src/pages/CoberturaSanitaria.jsx');
  const training = read('src/pages/FormacionSanitaria.jsx');
  const labor = read('src/pages/SaludLaboral.jsx');
  const bot = read('src/components/Chatbot.jsx');
  assert.match(about, /asistencia integral, flexible/);
  assert.match(about, /formación sanitaria para empresas/);
  assert.match(services, /Asistencia Sanitaria Integral para Empresas/);
  assert.match(healthcare, /Asistencia Sanitaria Integral en Empresas/);
  assert.match(training, /primeros auxilios, reanimación cardiopulmonar/);
  assert.match(labor, /title: 'Enfermería presencial'/);
  assert.match(labor, /horarios, funciones y recursos definidos/);
  assert.doesNotMatch(labor, /reconocimientos médicos|certificación garantizada/i);
  assert.match(bot, /Asistencia sanitaria integral para empresas/);
  for (const source of [about, services, healthcare, training]) {
    assert.doesNotMatch(source, /venta de (?:DEA|desfibriladores)/i);
  }
});


test('salud laboral explica la propuesta con beneficios sin prometer disponibilidad ni servicios médicos ajenos', () => {
  const labor = read('src/pages/SaludLaboral.jsx');
  assert.match(labor, /Nos adaptamos a la actividad y organización de cada centro/);
  assert.match(labor, /previa comprobación de su viabilidad y requisitos/);
  assert.doesNotMatch(labor, /(?:reconocimientos médicos|servicio de prevención ajeno|disponibilidad garantizada)/i);
});
