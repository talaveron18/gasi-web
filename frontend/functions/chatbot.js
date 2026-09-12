const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'invalid_json' }) };
  }

  const name = String(data.name || '').trim().slice(0, 120);
  const phone = String(data.phone || '').trim().slice(0, 40);
  const service = String(data.service || '').trim().slice(0, 160);

  if (!name || !phone || !service) {
    return { statusCode: 400, body: JSON.stringify({ message: 'missing_fields' }) };
  }

  const mailerSendKey = process.env.MAILERSEND_API_KEY;
  if (!mailerSendKey) {
    console.error('MAILERSEND_API_KEY is not configured');
    return { statusCode: 503, body: JSON.stringify({ message: 'service_unavailable' }) };
  }

  const emailBody = `
    <h2>Nuevo contacto desde el chatbot GASI</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Servicio de interes:</strong> ${escapeHtml(service)}</p>
  `;

  const emailResponse = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mailerSendKey}`
    },
    body: JSON.stringify({
      from: { email: 'coordinacion@gasisalud.com', name: 'Web GASI' },
      to: [{ email: 'coordinacion@gasisalud.com', name: 'GASI Coordinacion' }],
      subject: `Chatbot GASI: ${name} - ${service}`,
      html: emailBody
    })
  });

  if (!emailResponse.ok) {
    console.error('MailerSend request failed', emailResponse.status);
    return { statusCode: 502, body: JSON.stringify({ message: 'delivery_failed' }) };
  }

  const callMeBotPhone = process.env.CALLMEBOT_PHONE;
  const callMeBotApiKey = process.env.CALLMEBOT_API_KEY;
  if (callMeBotPhone && callMeBotApiKey) {
    const whatsappMsg = encodeURIComponent(`GASI Chatbot - Nuevo contacto: ${name} | ${phone} | ${service}`);
    const whatsappResponse = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(callMeBotPhone)}&text=${whatsappMsg}&apikey=${encodeURIComponent(callMeBotApiKey)}`);
    if (!whatsappResponse.ok) console.error('Optional WhatsApp notification failed', whatsappResponse.status);
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'ok' }) };
};
