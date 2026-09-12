const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const json = (statusCode, message, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  },
  body: JSON.stringify({ message })
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{6,40}$/;
const ALLOWED_SERVICES = new Set([
  'Enfermería presencial',
  'Apoyo médico remoto',
  'Fisioterapia',
  'Psicología',
  'Formación sanitaria',
  'Otro'
]);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, 'method_not_allowed', { Allow: 'POST' });
  }

  const contentType = String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) return json(415, 'unsupported_media_type');

  if ((event.body || '').length > 12000) return json(413, 'payload_too_large');

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return json(400, 'invalid_json');
  }

  // Honeypot: bots commonly fill hidden fields. Return success without delivery.
  if (String(data.website || '').trim()) return json(200, 'ok');

  const name = String(data.name || '').trim().slice(0, 120);
  const company = String(data.company || '').trim().slice(0, 160);
  const email = String(data.email || '').trim().toLowerCase().slice(0, 254);
  const phone = String(data.phone || '').trim().slice(0, 40);
  const employeeCount = String(data.employee_count || '').trim().slice(0, 40);
  const serviceType = String(data.service_type || '').trim().slice(0, 160);
  const message = String(data.message || '').trim().slice(0, 4000);

  if (!name || !company || !email || !phone || !serviceType) return json(400, 'missing_fields');
  if (!EMAIL_RE.test(email)) return json(400, 'invalid_email');
  if (!PHONE_RE.test(phone)) return json(400, 'invalid_phone');
  if (!ALLOWED_SERVICES.has(serviceType)) return json(400, 'invalid_service');
  if (employeeCount && !/^[\d\s+.-]{1,40}$/.test(employeeCount)) return json(400, 'invalid_employee_count');

  const mailerSendKey = process.env.MAILERSEND_API_KEY;
  if (!mailerSendKey) {
    console.error('MAILERSEND_API_KEY is not configured');
    return json(503, 'service_unavailable');
  }

  const emailBody = `
    <h2>Nuevo contacto desde la web GASI</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
    <p><strong>Empresa:</strong> ${escapeHtml(company)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Trabajadores:</strong> ${escapeHtml(employeeCount || 'No indicado')}</p>
    <p><strong>Servicio:</strong> ${escapeHtml(serviceType)}</p>
    <p><strong>Mensaje:</strong> ${escapeHtml(message)}</p>
  `;

  let emailResponse;
  try {
    emailResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mailerSendKey}`
      },
      body: JSON.stringify({
        from: { email: 'coordinacion@gasisalud.com', name: 'Web GASI' },
        to: [{ email: 'coordinacion@gasisalud.com', name: 'GASI Coordinacion' }],
        subject: `Nuevo contacto web: ${name} - ${company}`,
        html: emailBody
      })
    });
  } catch (error) {
    console.error('MailerSend transport error', error?.name || 'unknown_error');
    return json(502, 'delivery_failed');
  }

  if (!emailResponse.ok) {
    console.error('MailerSend request failed', emailResponse.status);
    return json(502, 'delivery_failed');
  }

  const callMeBotPhone = process.env.CALLMEBOT_PHONE;
  const callMeBotApiKey = process.env.CALLMEBOT_API_KEY;
  if (callMeBotPhone && callMeBotApiKey) {
    const whatsappMsg = encodeURIComponent(`GASI Web - Nuevo contacto: ${name} | ${company} | ${phone} | ${serviceType}`);
    try {
      const whatsappResponse = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(callMeBotPhone)}&text=${whatsappMsg}&apikey=${encodeURIComponent(callMeBotApiKey)}`);
      if (!whatsappResponse.ok) console.error('Optional WhatsApp notification failed', whatsappResponse.status);
    } catch (error) {
      console.error('Optional WhatsApp notification transport error', error?.name || 'unknown_error');
    }
  }

  return json(200, 'ok');
};