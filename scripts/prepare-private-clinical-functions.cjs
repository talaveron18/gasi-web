// Build ONLY the guarded clinical entrypoint. The inner handler must never be
// published as an unguarded standalone Netlify Function.
// This affects the dedicated private Netlify site, not the commercial site.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'netlify', 'functions');
const target = path.join(root, 'netlify', 'private-clinical-functions-build');
const shared = path.join(target, '_shared');
const read = name => fs.readFileSync(path.join(source, name), 'utf8');

const config = 'export const config:Config={path:"/api/internal-clinical/*"};';
let inner = read('internal-clinical.mts');
if (inner.split(config).length !== 2) throw new Error('Unsafe clinical handler structure: expected one direct-route export');
inner = inner.replace(config, '');
if (inner.includes('export const config')) throw new Error('Unexpected direct-route export');
let guarded = read('internal-clinical-guarded.mts');
const originalImport = 'from "./internal-clinical.mts"';
if (guarded.split(originalImport).length !== 2) throw new Error('Clinical gateway no longer imports the expected private handler');
guarded = guarded.replace(originalImport, 'from "./_shared/internal-clinical.mts"');

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(shared, { recursive: true });
fs.writeFileSync(path.join(shared, 'internal-clinical.mts'), inner);
fs.writeFileSync(path.join(shared, 'internal-audit-tenant-chain.mts'), read('internal-audit-tenant-chain.mts'));
fs.writeFileSync(path.join(target, 'internal-clinical-guarded.mts'), guarded);
const entries = fs.readdirSync(target);
if (JSON.stringify(entries.sort()) !== JSON.stringify(['_shared', 'internal-clinical-guarded.mts'])) {
  throw new Error('Private build contains an unexpected publicly routable function');
}
console.log('Private clinical functions prepared: guarded gateway only');
