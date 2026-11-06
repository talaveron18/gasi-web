// Commercial-only Netlify functions. Never copy internal clinical or course handlers.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'netlify', 'functions');
const target = path.join(root, 'netlify', 'commercial-functions-build');
const allowed = ['contact.js', 'chatbot.js', 'public-lead-utils.js'];
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const name of allowed) fs.copyFileSync(path.join(source, name), path.join(target, name));
const actual = fs.readdirSync(target).sort();
if (JSON.stringify(actual) !== JSON.stringify([...allowed].sort())) throw new Error('Unexpected commercial functions');
console.log('Commercial functions packaged:', actual.join(', '));
