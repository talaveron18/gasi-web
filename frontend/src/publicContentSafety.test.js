import fs from 'fs';
import path from 'path';

const PUBLIC_COPY_FILES = [
  'pages/Home.jsx',
  'pages/CoberturaSanitaria.jsx',
  'pages/FormacionSanitaria.jsx',
  'pages/Contacto.jsx',
  'pages/Servicios.jsx',
  'pages/SaludLaboral.jsx',
  'pages/Sectores.jsx',
  'pages/QuienesSomos.jsx',
  'components/Navbar.jsx',
  'components/Footer.jsx',
  'components/Chatbot.jsx',
  '../public/index.html',
];

const readPublicCopy = () => PUBLIC_COPY_FILES.map((relativePath) => {
  const absolutePath = path.join(__dirname, relativePath);
  expect(fs.existsSync(absolutePath)).toBe(true);
  return { relativePath, content: fs.readFileSync(absolutePath, 'utf8') };
});

describe('public content safety contract', () => {
  test('does not advertise medical examinations anywhere in public copy or SEO metadata', () => {
    for (const { relativePath, content } of readPublicCopy()) {
      expect({ relativePath, content: content.toLowerCase() }).not.toEqual(
        expect.objectContaining({ content: expect.stringContaining('reconocimientos médicos') })
      );
      expect({ relativePath, content: content.toLowerCase() }).not.toEqual(
        expect.objectContaining({ content: expect.stringContaining('reconocimientos medicos') })
      );
    }
  });

  test('public service catalogue stays limited to current service families', () => {
    const home = fs.readFileSync(path.join(__dirname, 'pages/Home.jsx'), 'utf8');
    const footer = fs.readFileSync(path.join(__dirname, 'components/Footer.jsx'), 'utf8');
    const chatbot = fs.readFileSync(path.join(__dirname, 'components/Chatbot.jsx'), 'utf8');
    const seo = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

    expect(home).toContain('Asistencia Sanitaria Integral para Empresas');
    expect(home).toContain("title: 'Asistencia Sanitaria Integral'");
    expect(home).toContain("link: '/cobertura-sanitaria'");
    expect(home).toContain("link: '/formacion-sanitaria'");
    expect(home).toContain('Formación Sanitaria');
    expect(footer).toContain('Enfermería presencial para organizaciones');
    expect(footer).toContain('Formación Sanitaria');
    expect(chatbot).toContain("const SERVICES = ['Enfermería presencial', 'Formación sanitaria', 'Otro']");
    expect(seo).toContain('Enfermería presencial y formación sanitaria para organizaciones');
    expect(seo).toContain('<title>GASI | Enfermería presencial y formación sanitaria</title>');
  });


  test('home commercial CTAs are semantic links without nested buttons', () => {
    const home = fs.readFileSync(path.join(__dirname, 'pages/Home.jsx'), 'utf8');
    for (const [testId, destination] of [
      ['hero-cta-contact', '/contacto'],
      ['hero-cta-services', '/servicios'],
      ['sectors-cta', '/sectores'],
      ['cta-contact-bottom', '/contacto'],
    ]) {
      expect(home).toContain('to="' + destination + '"');
      expect(home).toContain('data-testid="' + testId + '"');
    }
    expect(home).not.toContain('<Button');
    expect(home).not.toContain("import { Button } from '@/components/ui/button'");
  });

  test('desktop and mobile navigation links never nest buttons', () => {
    const navbar = fs.readFileSync(path.join(__dirname, 'components/Navbar.jsx'), 'utf8');
    expect(navbar).not.toMatch(/<Link\\b[^>]*>\\s*<Button\\b/);
    for (const destination of ['/', '/quienes-somos', '/servicios', '/sectores', '/contacto', '/acceso']) {
      expect(navbar).toContain('to="' + destination + '"');
    }
    expect(navbar).toContain('nav-services-dropdown');
    expect(navbar).toContain('mobile-menu-button');
  });

  test('public chatbot explicitly rejects clinical and emergency use', () => {
    const chatbot = fs.readFileSync(path.join(__dirname, 'components/Chatbot.jsx'), 'utf8').toLowerCase();
    expect(chatbot).toContain('no es un canal clínico ni de urgencias');
    expect(chatbot).toContain('no enviaré datos clínicos o de salud');
  });
});
