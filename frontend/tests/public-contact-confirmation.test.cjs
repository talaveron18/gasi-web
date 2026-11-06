// Run from repository root: node --test frontend/tests/public-contact-confirmation.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('contact form does not imply mailbox delivery or service acceptance', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/Contacto.jsx'), 'utf8');
  assert.match(source, /toast\.success\('Solicitud enviada al servicio de recepción\./);
  assert.match(source, /Esto no confirma su entrega al buzón ni la aceptación del servicio/);
  assert.match(source, /Si no recibe respuesta, escriba a coordinacion@gasisalud\.com/);
  assert.doesNotMatch(source, /toast\.success\('Formulario enviado\. Revisaremos su solicitud y nos pondremos en contacto\.'/);
  assert.match(source, /No incluya información clínica, datos de pacientes ni datos de salud/);
  assert.match(source, /El envío de este formulario no confirma disponibilidad, contratación ni prestación sanitaria/);
});
