exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body);

  const emailBody = `
    <h2>Nuevo contacto desde la web GASI</h2>
    <p><strong>Nombre:</strong> ${data.name}</p>
    <p><strong>Empresa:</strong> ${data.company}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Teléfono:</strong> ${data.phone}</p>
    <p><strong>Trabajadores:</strong> ${data.employee_count || 'No indicado'}</p>
    <p><strong>Servicio de interés:</strong> ${data.service_type}</p>
    <p><strong>Mensaje:</strong> ${data.message}</p>
  `;

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`
    },
    body: JSON.stringify({
      from: { email: 'coordinacion@gasisalud.com', name: 'Web GASI' },
      to: [{ email: 'coordinacion@gasisalud.com', name: 'GASI Coordinación' }],
      subject: `Nuevo contacto web: ${data.name} - ${data.company}`,
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
    body: JSON.stringify({ message: 'Email enviado correctamente' })
  };
};
