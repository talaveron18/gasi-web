const fs = require('fs');
const path = require('path');

describe('Chatbot public lead confirmation', () => {
  const source = fs.readFileSync(path.join(__dirname, 'Chatbot.jsx'), 'utf8');

  test('does not claim inbox receipt after HTTP acceptance', () => {
    expect(source).not.toContain('Hemos recibido tus datos');
    expect(source).toContain('Esto no confirma su entrega al buzón');
    expect(source).toContain('coordinacion@gasisalud.com');
  });

  test('retains the non-clinical and emergency warning', () => {
    expect(source).toContain('Este asistente no es un canal clínico ni de urgencias');
  });
});
