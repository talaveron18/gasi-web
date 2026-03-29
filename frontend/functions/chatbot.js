exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body);

  const emailBody = `
    <h2>Nuevo contacto desde el chatbot GASI</h2>
    <p><strong>Nombre:</strong> ${data.name}</p>
    <p><strong>Telefono:</strong> ${data.phone}</p>
    <p><strong>Servicio de interes:</strong> ${data.service}</p>
    <p><strong>Mensaje:</strong> ${data.message || 'No indicado'}</p>
  `;

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`
    },
    body: JSON.stringify({
      from: { email: 'coordinacion@gasisalud.com', name: 'Web GASI' },
      to: [{ email: 'coordinacion@gasisalud.com', name: 'GASI Coordinacion' }],
      subject: `Chatbot GASI: ${data.name} - ${data.service}`,
      html: emailBody
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('MailerSend error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al enviar el email' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'ok' })
  };
};
