const fs = require('fs');
const path = require('path');

const PUBLIC_SURFACE_FILES = [
  'App.js',
  'pages/Home.jsx',
  'pages/QuienesSomos.jsx',
  'pages/Servicios.jsx',
  'pages/CoberturaSanitaria.jsx',
  'pages/FormacionSanitaria.jsx',
  'pages/SaludLaboral.jsx',
  'pages/Sectores.jsx',
  'pages/Contacto.jsx',
  'pages/PoliticaPrivacidad.jsx',
  'pages/AccessPortal.jsx',
  'pages/StudentAccess.jsx',
  'pages/InternalAccess.jsx',
  'pages/NotFound.jsx',
  'components/Layout.jsx',
  'components/Navbar.jsx',
  'components/Footer.jsx',
  'components/Chatbot.jsx',
];

const read = relativePath => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
const publicSource = PUBLIC_SURFACE_FILES.map(file => `\n/* ${file} */\n${read(file)}`).join('\n');
const metadata = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const netlifyChatbot = fs.readFileSync(path.join(__dirname, '../../netlify/functions/chatbot.js'), 'utf8');
const legacyFrontendChatbot = fs.readFileSync(path.join(__dirname, '../functions/chatbot.js'), 'utf8');
const publicRuntimeSource = `${netlifyChatbot}\n${legacyFrontendChatbot}`;

// Claims that are outside the currently approved public offer. Keep this list explicit so
// future copy changes fail CI instead of silently reintroducing obsolete promises.
const FORBIDDEN_PUBLIC_CLAIMS = [
  /reconocimientos?\s+m[eé]dicos?/i,
  /chequeos?\s+m[eé]dicos?/i,
  /ex[aá]menes?\s+de\s+salud\s+laboral/i,
  /certificados?\s+de\s+aptitud\s+(?:m[eé]dica|laboral)/i,
  /medicina\s+del\s+trabajo/i,
  /vigilancia\s+de\s+la\s+salud\s+(?:para|en|a)\s+(?:empresas|trabajadores|organizaciones)/i,
  /prevenci[oó]n\s+de\s+riesgos\s+laborales\s+(?:para|en|a)\s+(?:empresas|trabajadores|organizaciones)/i,
  /evaluaci[oó]n\s+de\s+riesgos\s+(?:laborales|para empresas)/i,
  /gesti[oó]n\s+de\s+bajas\s+(?:laborales|m[eé]dicas)/i,
  /servicio\s+de\s+ambulancias/i,
  /ambulancia\s+(?:propia|24\s*\/\s*7)/i,
  /urgencias\s+24\s*\/\s*7/i,
  /disponibilidad\s+inmediata/i,
];

describe('reconciliación del contenido público GASI', () => {
  test.each(FORBIDDEN_PUBLIC_CLAIMS)('no publica la promesa obsoleta %s', pattern => {
    expect(publicSource).not.toMatch(pattern);
    expect(metadata).not.toMatch(pattern);
    expect(publicRuntimeSource).not.toMatch(pattern);
  });

  test('el inventario de auditoría cubre el router y el layout público además de cada página pública activa', () => {
    const app = read('App.js');
    const requiredAuditFiles = [
      'App.js',
      'components/Layout.jsx',
      'components/Navbar.jsx',
      'components/Footer.jsx',
      'components/Chatbot.jsx',
      'pages/Home.jsx',
      'pages/QuienesSomos.jsx',
      'pages/Servicios.jsx',
      'pages/CoberturaSanitaria.jsx',
      'pages/FormacionSanitaria.jsx',
      'pages/SaludLaboral.jsx',
      'pages/Sectores.jsx',
      'pages/Contacto.jsx',
      'pages/PoliticaPrivacidad.jsx',
      'pages/AccessPortal.jsx',
      'pages/StudentAccess.jsx',
      'pages/InternalAccess.jsx',
      'pages/NotFound.jsx',
    ];
    requiredAuditFiles.forEach(file => expect(PUBLIC_SURFACE_FILES).toContain(file));
    expect(app).toContain('<Route path="/" element={<Home/>}/>');
    expect(app).toContain('<Route path="/servicios" element={<Servicios/>}/>');
    expect(app).toContain('<Route path="/cobertura-sanitaria" element={<CoberturaSanitaria/>}/>');
    expect(app).toContain('<Route path="/formacion-sanitaria" element={<FormacionSanitaria/>}/>');
    expect(app).toContain('<Route path="/servicios-sanitarios-organizaciones" element={<SaludLaboral/>}/>');
    expect(app).toContain('<Route path="/sectores" element={<Sectores/>}/>');
    expect(app).toContain('<Route path="/contacto" element={<Contacto/>}/>');
  });

  test('descubre automáticamente páginas públicas nuevas declaradas en el router', () => {
    const app = read('App.js');
    const imports = new Map(
      [...app.matchAll(/import\s+(\w+)\s+from\s*['"]@\/pages\/([^'"]+)['"]/g)]
        .map(([, component, filename]) => [component, `pages/${filename}.jsx`])
    );
    const publicRoutes = [...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<([A-Z]\w*)\s*\/>\}/g)]
      .filter(([, route, component]) =>
        !route.startsWith('/interno') &&
        !route.startsWith('/dashboard') &&
        component !== 'Navigate'
      );
    expect(publicRoutes.length).toBeGreaterThan(0);
    for (const [, route, component] of publicRoutes) {
      const file = imports.get(component);
      expect(file).toBeDefined();
      expect(PUBLIC_SURFACE_FILES).toContain(file);
    }
  });

  test('la ruta de organizaciones delimita positivamente el alcance público actual', () => {
    const organisations = read('pages/SaludLaboral.jsx');
    expect(organisations).toContain('La oferta pública se limita a los servicios descritos en esta web. La disponibilidad de cada actividad está condicionada al alcance acordado y a los requisitos profesionales y administrativos aplicables.');
    expect(organisations).toContain('Enfermería presencial y formación sanitaria, con alcance sujeto a confirmación previa y a los requisitos aplicables.');
  });

  test('metadatos limitan la oferta a enfermería presencial y formación sanitaria', () => {
    expect(metadata).toContain('Enfermería presencial y formación sanitaria para organizaciones, sujetas a confirmación previa de alcance y requisitos aplicables.');
    expect(metadata).toContain('<title>GASI | Enfermería presencial y formación sanitaria</title>');
  });

  test('chatbot público sigue siendo comercial, no clínico y no de urgencias', () => {
    const chatbot = read('components/Chatbot.jsx');
    expect(chatbot).toContain('Este asistente sirve únicamente para contacto comercial e información general. No es un canal clínico ni de urgencias.');
    expect(chatbot).toContain("const SERVICES = ['Enfermería presencial', 'Formación sanitaria', 'Otro'];");
  });

  test('los runtimes del chatbot no amplían la oferta ni aceptan categorías obsoletas', () => {
    expect(netlifyChatbot).toContain('El asistente público no admite contenido clínico ni datos de salud.');
    expect(legacyFrontendChatbot).toContain("'Enfermería presencial'");
    expect(legacyFrontendChatbot).toContain("'Formación sanitaria'");
    expect(legacyFrontendChatbot).toContain("'Otro'");
    expect(legacyFrontendChatbot).toContain('if (!ALLOWED_SERVICES.has(service))');
    expect(legacyFrontendChatbot).toContain('Canal exclusivamente comercial. No admite contenido clínico ni urgencias.');
  });

  test('el WhatsApp flotante es inequívocamente comercial y desaconseja datos de salud', () => {
    const layout = read('components/Layout.jsx');
    expect(layout).toContain('consulta%20comercial%20sobre%20GASI.%20No%20incluyo%20datos%20de%20salud');
    expect(layout).toContain('WhatsApp comercial · no es un canal clínico ni de urgencias');
  });
});
