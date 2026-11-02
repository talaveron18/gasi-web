import fs from 'fs';
import path from 'path';

const PUBLIC_COPY_FILES = [
  'pages/Home.jsx',
  'pages/CoberturaSanitaria.jsx',
  'pages/FormacionSanitaria.jsx',
  'pages/Contacto.jsx',
  'pages/Servicios.jsx',
  'pages/Sectores.jsx',
  'pages/QuienesSomos.jsx',
  'components/Navbar.jsx',
  'components/Footer.jsx',
  'components/Chatbot.jsx',
];

const readPublicCopy = () => PUBLIC_COPY_FILES.map((relativePath) => {
  const absolutePath = path.join(__dirname, relativePath);
  expect(fs.existsSync(absolutePath)).toBe(true);
  return { relativePath, content: fs.readFileSync(absolutePath, 'utf8') };
});

describe('public content safety contract', () => {
  test('does not advertise medical examinations anywhere in public copy', () => {
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

    expect(home).toContain('Enfermería Presencial en Empresas');
    expect(home).toContain('Formación Sanitaria');
    expect(footer).toContain('Enfermería presencial para organizaciones');
    expect(footer).toContain('Formación Sanitaria');
    expect(chatbot).toContain("const SERVICES = ['Enfermería presencial', 'Formación sanitaria', 'Otro']");
  });

  test('public chatbot explicitly rejects clinical and emergency use', () => {
    const chatbot = fs.readFileSync(path.join(__dirname, 'components/Chatbot.jsx'), 'utf8').toLowerCase();
    expect(chatbot).toContain('no es un canal clínico ni de urgencias');
    expect(chatbot).toContain('no enviaré datos clínicos o de salud');
  });
});
