const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'netlify/commercial-functions-build');
test('commercial deploy packages only two public handlers and their shared utility', () => {
  assert.deepEqual(fs.readdirSync(directory).sort(), ['chatbot.js','contact.js','public-lead-utils.js']);
  const config = fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
  assert.match(config, /directory = "netlify\/commercial-functions-build"/);
  assert.match(config, /from = "\/api\/internal-clinical\/\*"\s+to = "\/api-unavailable\.json"\s+status = 404/);
  assert.match(config, /from = "\/api\/\*"\s+to = "\/api-unavailable\.json"\s+status = 404\s+force = true/);
  assert.ok(config.indexOf('from = "/api/*"') < config.indexOf('from = "/*"'), "Private APIs must be blocked before the SPA fallback");
  assert.doesNotMatch(config, /to = "\/\.netlify\/functions\/internal-clinical/);
  for (const name of fs.readdirSync(directory)) assert.doesNotMatch(name, /internal|clinical|public-api|course/i);
});
