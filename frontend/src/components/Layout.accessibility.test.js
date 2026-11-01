import fs from 'fs';
import path from 'path';

describe('public layout accessibility contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'Layout.jsx'), 'utf8');

  test('provides a keyboard-visible skip link to the main landmark', () => {
    expect(source).toContain('href="#main-content"');
    expect(source).toContain('Saltar al contenido principal');
    expect(source).toMatch(/sr-only[^\n"]*focus:not-sr-only/);
    expect(source).toContain('<main id="main-content"');
  });

  test('main landmark can receive focus after skip navigation', () => {
    expect(source).toMatch(/<main id="main-content"[^>]*tabIndex=\{-1\}/);
  });
});
