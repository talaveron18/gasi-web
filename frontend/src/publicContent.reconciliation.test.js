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
  'pages/Dashboard.jsx',
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
const netlifyContact = fs.readFileSync(path.join(__dirname, '../../netlify/functions/contact.js'), 'utf8');
const legacyFrontendContact = fs.readFileSync(path.join(__dirname, '../functions/contact.js'), 'utf8');
const publicLeadUtils = fs.readFileSync(path.join(__dirname, '../../netlify/functions/public-lead-utils.js'), 'utf8');
const publicRuntimeSource = `${netlifyChatbot}\n${legacyFrontendChatbot}\n${netlifyContact}\n${legacyFrontendContact}\n${publicLeadUtils}`;

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
      'pages/Dashboard.jsx',
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
    // Inspect each route's complete element, including authentication wrappers.
    // A new public route must not escape the inventory because its first JSX tag is a guard.
    const routeElements = [...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g)];
    const publicRoutes = routeElements.filter(([, route]) =>
      !route.startsWith('/interno') && !route.startsWith('/dashboard')
    );
    expect(publicRoutes.length).toBeGreaterThan(0);
    for (const [, route, element] of publicRoutes) {
      if (/^<Navigate\b/.test(element)) continue;
      const pageComponents = [...element.matchAll(/<([A-Z]\w*)\b/g)]
        .map(([, component]) => component)
        .filter(component => imports.has(component));
      expect(pageComponents.length).toBeGreaterThan(0);
      for (const component of pageComponents) {
        expect(PUBLIC_SURFACE_FILES).toContain(imports.get(component));
      }
    }
  });


  test('los enlaces internos de navegación, footer y páginas comerciales tienen una ruta real', () => {
    const app = read('App.js');
    const declaredRoutes = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]));
    const sources = [
      'pages/Home.jsx', 'pages/Servicios.jsx', 'pages/CoberturaSanitaria.jsx',
      'pages/FormacionSanitaria.jsx', 'pages/SaludLaboral.jsx',
      'pages/Sectores.jsx', 'pages/QuienesSomos.jsx', 'pages/Contacto.jsx',
      'pages/PoliticaPrivacidad.jsx', 'pages/AccessPortal.jsx',
      'pages/StudentAccess.jsx', 'pages/NotFound.jsx',
      'components/Navbar.jsx', 'components/Footer.jsx', 'components/Chatbot.jsx',
    ];
    const missing = [];
    for (const file of sources) {
      for (const [, destination] of read(file).matchAll(/<Link\b[^>]*\bto="(\/[^"]*)"/g)) {
        if (!declaredRoutes.has(destination)) missing.push(file + ': ' + destination);
      }
    }
    expect(missing).toEqual([]);
    expect(declaredRoutes.has('/contacto')).toBe(true);
    expect(declaredRoutes.has('/formacion-sanitaria')).toBe(true);
    expect(declaredRoutes.has('/cobertura-sanitaria')).toBe(true);
  });

  test('los enlaces HTML internos de páginas públicas apuntan a rutas existentes', () => {
    const routes = new Set([...read('App.js').matchAll(/<Route\\s+path="([^"]+)"/g)].map(match => match[1]));
    const invalid = [];
    for (const file of PUBLIC_SURFACE_FILES.filter(file => file !== 'App.js')) {
      const source = read(file);
      for (const [, destination] of source.matchAll(/<a\\b[^>]*\\bhref=["'](\\/[^"'?#]*)(?:[?#][^"']*)?["']/g)) {
        if (!routes.has(destination)) invalid.push(file + ': ' + destination);
      }
    }
    expect(invalid).toEqual([]);
  });

  test('los CTA públicos no utilizan destinos vacíos ni marcadores de posición', () => {
    const sources = [
      'pages/Home.jsx', 'pages/Servicios.jsx', 'pages/CoberturaSanitaria.jsx',
      'pages/FormacionSanitaria.jsx', 'pages/SaludLaboral.jsx',
      'pages/Sectores.jsx', 'pages/QuienesSomos.jsx', 'pages/Contacto.jsx',
      'pages/PoliticaPrivacidad.jsx', 'pages/AccessPortal.jsx',
      'pages/StudentAccess.jsx', 'pages/NotFound.jsx',
      'components/Navbar.jsx', 'components/Footer.jsx', 'components/Chatbot.jsx',
      'components/Layout.jsx',
    ];
    const invalid = [];
    for (const file of sources) {
      const source = read(file);
      for (const [, tag, destination] of source.matchAll(/<(Link|a)\b[^>]*?\b(?:to|href)=["']([^"']*)["'][^>]*>/g)) {
        if (destination === '#main-content') {
          // Enlace de salto accesible: debe apuntar a un destino real del layout.
          if (file !== 'components/Layout.jsx' || !source.includes('id="main-content"')) {
            invalid.push(file + ': ' + tag + ' -> ' + destination);
          }
        } else if (!destination.trim() || destination.startsWith('#') || /^javascript:/i.test(destination.trim())) {
          invalid.push(file + ': ' + tag + ' -> ' + destination);
        }
      }
    }
    expect(invalid).toEqual([]);
    expect(read('components/Layout.jsx')).toContain('href="#main-content"');
    expect(read('components/Layout.jsx')).toContain('id="main-content"');
  });

  test('no expone compra, precios ni certificados de cursos desde la ruta pública de detalle', () => {
    const app = read('App.js');
    expect(app).toContain('<Route path="/curso/:courseId" element={<Navigate to="/formacion-sanitaria" replace/>}/>');
    expect(app).not.toMatch(/import\s+CursoDetalle\s+from/);
    const training = read('pages/FormacionSanitaria.jsx');
    expect(training).toContain('La publicación de esta página no implica disponibilidad de un curso concreto, certificación, precio ni fecha.');
  });

  test('las páginas comerciales no enlazan a inscripción ni pagos de cursos no confirmados', () => {
    const commercial = [
      'pages/Home.jsx', 'pages/Servicios.jsx', 'pages/FormacionSanitaria.jsx',
      'pages/CoberturaSanitaria.jsx', 'pages/SaludLaboral.jsx',
      'pages/Sectores.jsx', 'pages/QuienesSomos.jsx',
      'components/Navbar.jsx', 'components/Footer.jsx',
    ].map(read).join('\n');
    expect(commercial).not.toMatch(/to=["']\/curso\//);
    expect(commercial).not.toMatch(/to=["']\/dashboard\/admin\/cursos/);
    expect(commercial).not.toMatch(/(?:Comprar por|Inscribirme gratis|Certificado de finalización)/i);
  });

  test('el panel de alumnado no promete cursos disponibles ni enlaces de acceso inactivos', () => {
    const dashboard = read('pages/Dashboard.jsx');
    const app = read('App.js');
    expect(app).toContain('<Route path="/dashboard" element={<StudentAuthenticated><Dashboard/></StudentAuthenticated>}/>');
    expect(dashboard).not.toContain('Continuar curso');
    expect(dashboard).not.toContain('Ver cursos disponibles');
    expect(dashboard).not.toContain('Explorar más cursos');
    expect(dashboard).not.toContain('to={`/curso/');
    expect(dashboard).not.toContain('to="/dashboard/admin/cursos"');
    expect(dashboard).toContain('La disponibilidad de cada actividad se confirma previamente.');
    expect(dashboard).toContain('Consulta con GASI la disponibilidad del acceso al contenido de este curso.');
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
    expect(publicLeadUtils).toContain('"Enfermería presencial"');
    expect(publicLeadUtils).toContain('"Formación sanitaria"');
    expect(publicLeadUtils).toContain('"Otro"');
    expect(publicLeadUtils).toContain('if(!SERVICES.has(lead.service))return{error:"invalid_service"}');
    expect(legacyFrontendChatbot).toContain("'Enfermería presencial'");
    expect(legacyFrontendChatbot).toContain("'Formación sanitaria'");
    expect(legacyFrontendChatbot).toContain("'Otro'");
    expect(legacyFrontendChatbot).toContain('if (!ALLOWED_SERVICES.has(service))');
    expect(legacyFrontendChatbot).toContain('Canal exclusivamente comercial. No admite contenido clínico ni urgencias.');
    expect(legacyFrontendContact).toContain('if (!ALLOWED_SERVICES.has(serviceType))');
    expect(netlifyContact).toContain('validateBaseLead(parsed.data,{requireCompany:true,requireMessage:true})');
  });

  test('el formulario comercial advierte sobre datos de salud y no confirma prestaciones', () => {
    const contacto = read('pages/Contacto.jsx');
    expect(contacto).toContain('Este formulario es solo para consultas comerciales.');
    expect(contacto).toContain('No incluya información clínica, datos de pacientes ni datos de salud.');
    expect(contacto).toContain('No es un canal de urgencias.');
    expect(contacto).toContain('El envío de este formulario no confirma disponibilidad, contratación ni prestación sanitaria.');
    expect(contacto).toContain('placeholder="Describa únicamente su necesidad comercial, sin datos clínicos ni de salud"');
    expect(contacto).toContain('value="Enfermería presencial"');
    expect(contacto).toContain('value="Formación sanitaria"');
    expect(contacto).not.toMatch(/value=["'](?:Reconocimientos médicos|Vigilancia de la salud)["']/i);
  });

  test('el WhatsApp flotante es inequívocamente comercial y desaconseja datos de salud', () => {
    const layout = read('components/Layout.jsx');
    expect(layout).toContain('consulta%20comercial%20sobre%20GASI.%20No%20incluyo%20datos%20de%20salud');
    expect(layout).toContain('WhatsApp comercial · no es un canal clínico ni de urgencias');
  });
});
