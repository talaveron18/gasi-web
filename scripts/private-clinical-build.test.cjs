'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('private build exposes only the tenant guarded clinical function', () => {
  execFileSync(process.execPath, ['scripts/prepare-private-clinical-functions.cjs'], {cwd: root});
  const dir = path.join(root, 'netlify/private-clinical-functions-build');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['_shared', 'internal-clinical-guarded.mts']);
  assert.deepEqual(fs.readdirSync(path.join(dir, '_shared')).sort(), [
    'internal-audit-tenant-chain.mts', 'internal-clinical.mts'
  ]);
  const guarded = fs.readFileSync(path.join(dir,'internal-clinical-guarded.mts'),'utf8');
  const inner = fs.readFileSync(path.join(dir,'_shared/internal-clinical.mts'),'utf8');
  assert.match(guarded, /from "\.\/_shared\/internal-clinical\.mts"/);
  assert.match(guarded, /tenantBoundSession\(delegated\)/);
  assert.doesNotMatch(inner, /export const config/);
  assert.match(inner, /\/api\/internal-clinical\/login/);
});

test('dedicated configuration maps clinical routes to guard before its SPA fallback', () => {
  const config = fs.readFileSync(path.join(root, 'internal-site/netlify.toml'), 'utf8');
  assert.match(config, /from = "\/api\/internal-clinical\/\*"/);
  assert.match(config, /to = "\/\.netlify\/functions\/internal-clinical-guarded\?original_path=:splat"/);
  assert.ok(config.indexOf('from = "/api/internal-clinical/*"') < config.indexOf('from = "/api/*"'));
  assert.ok(config.indexOf('from = "/api/*"') < config.indexOf('from = "/*"'));
  assert.match(config, /REACT_APP_INTERNAL_PORTAL_ENABLED=true/);
  assert.match(config, /directory = "netlify\/private-clinical-functions-build"/);
  assert.doesNotMatch(config, /directory = "netlify\/commercial-functions-build"/);
});
