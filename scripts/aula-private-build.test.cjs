'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('a standalone private Aula frontend is actually compiled in CI', () => {
  assert.equal(process.env.REACT_APP_AULA_ENABLED, 'true',
    'CI must explicitly opt in to the private Aula build');
  const jsDir = path.join(root, 'frontend', 'build', 'static', 'js');
  assert.ok(fs.existsSync(jsDir), 'Private frontend build does not exist');
  const jsFiles = fs.readdirSync(jsDir).filter(name => /^main\..*\.js$/.test(name));
  assert.equal(jsFiles.length, 1, 'Expected exactly one compiled CRA main bundle');
  const bundle = fs.readFileSync(path.join(jsDir, jsFiles[0]), 'utf8');
  assert.ok(bundle.includes('/api/aula'), 'Private API client missing from bundled frontend');
  assert.ok(bundle.includes('/aula/mis-cursos'), 'Authenticated course route missing');
  assert.ok(bundle.includes('Entrar al aula'), 'Private login interface missing');
  for (const secretName of [
    'GASI_AULA_DB_URL', 'GASI_AULA_RESEND_API_KEY', 'AULA_BOOTSTRAP_PASSWORD',
    'RESEND_API_KEY', 'MAILERSEND_API_KEY'
  ]) assert.ok(!bundle.includes(secretName), secretName + ' must not appear in browser JS');
});
