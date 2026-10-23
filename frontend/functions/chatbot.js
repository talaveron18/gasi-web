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
  'Formación sanitaria',
  'Otro'
]);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, 'method_not_allowed', { Allow: 'POST' });

  const contentType = String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) return json(415, 'unsupported_media_type');
  if ((event.body || '').length > 6000) return json(413, 'payload_too_large');

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch { return json(400, 'invalid_json'); }
  if (String(data.website || '').trim()) return json(200, 'ok');

  const name = String(data.name || '').trim().slice(0, 120);
  const email = String(data.email || '').trim().slice(0, 254);
  const phone = String(data.phone || '').trim().slice(0, 40);
  const service = String(data.service || '').trim().slice(0, 160);
  const acceptsPrivacy = data.accepts_privacy === true;

  if (!name || !email || !phone || !service) return json(400, 'missing_fields');
  if (!acceptsPrivacy) return json(400, 'privacy_required');
  if (!EMAIL_RE.test(email)) return json(400, 'invalid_email');
  if (!PHONE_RE.test(phone)) return json(400, 'invalid_phone');
  if (!ALLOWED_SERVICES.has(service)) return json(400, 'invalid_service');

  const mailerSendKey = process.env.MAILERSEND_API_KEY;
  if (!mailerSendKey) return json(503, 'service_unavailable');

  const emailBody = `<h2>Nuevo contacto desde el chatbot GASI</h2><p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Correo:</strong> ${escapeHtml(email)}</p><p><strong>Telefono:</strong> ${escapeHtml(phone)}</p><p><strong>Servicio de interes:</strong> ${escapeHtml(service)}</p><p><em>Canal exclusivamente comercial. No admite contenido clínico ni urgencias.</em></p>`;
  let emailResponse;
  try {
    emailResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Bearer ${mailerSendKey}`},
      body: JSON.stringify({from:{email:'coordinacion@gasisalud.com',name:'Web GASI'},to:[{email:'coordinacion@gasisalud.com',name:'GASI Coordinacion'}],subject:`Chatbot GASI: ${name} - ${service}`,html:emailBody})
    });
  } catch { return json(502, 'delivery_failed'); }
  if (!emailResponse.ok) return json(502, 'delivery_failed');
  return json(200, 'ok');
};