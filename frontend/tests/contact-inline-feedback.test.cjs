const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/Contacto.jsx'), 'utf8');
test('contact shows accessible inline status instead of toast-only feedback', () => {
  assert.match(source, /data-testid="contact-submission-status"/);
  assert.match(source, /role=\{submissionStatus\.type === 'error' \? 'alert' : 'status'\}/);
  assert.match(source, /setSubmissionStatus\(\{ type: 'error', message:/);
  assert.match(source, /setSubmissionStatus\(\{ type: 'success', message:/);
  assert.match(source, /No se ha confirmado el envío/);
  assert.doesNotMatch(source, /toast\.error|toast\.success/);
});
