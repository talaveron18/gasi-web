const fs = require('fs');
const path = require('path');

const PUBLIC_SURFACE_FILES = [
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
  'components/Navbar.jsx',
  'components/Footer.jsx',
  'components/Chatbot.jsx',
];

const read = relativePath => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
const publicSource = PUBLIC_SURFACE_FILES.map(file => `\n/* ${file} */\n${read(file)}`).join('\n');
const metadata = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

// Claims that are outside the currently approved public offer. Keep this list explicit so
// future copy changes fail CI instead of silently reintroducing obsolete promises.
const FORBIDDEN_PUBLIC_CLAIMS = [
  /reconocimientos?\s+m[eé]dicos?\s+(?:para|en|a)\s+(?:empresas|trabajadores|organizaciones)/i,
  /vigilancia\s+de\s+la\s+salud\s+(?:para|en|a)\s+(?:empresas|trabajadores|organizaciones)/i,
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
  });

  test('mantiene la exclusión explícita de vigilancia de salud y reconocimientos médicos', () => {
    const organisations = read('pages/SaludLaboral.jsx');
    expect(organisations).toContain('Esta oferta no incluye vigilancia de la salud, reconocimientos médicos laborales, evaluación de riesgos ni gestión de bajas.');
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
});
