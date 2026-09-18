const SERVICES = new Set([
  'Enfermería presencial',
  'Apoyo médico remoto',
  'Fisioterapia',
  'Psicología',
  'Formación sanitaria',
  'Otro'
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { message: 'method_not_allowed' });
  if (Buffer.byteLength(event.body || '', 'utf8') > 16_384) return json(413, { message: 'payload_too_large' });

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { message: 'invalid_json' });
  }

  if (String(data.website || '').trim()) return json(200, { message: 'received' });
  if (data.accepts_privacy !== true) return json(422, { message: 'privacy_required' });

  const name = String(data.name || '').trim();
  const company = String(data.company || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const phone = String(data.phone || '').trim();
  const employeeCount = String(data.employee_count || '').trim();
  const serviceType = String(data.service_type || '').trim();
  const message = String(data.message || '').trim();

  if (!name || !company || !email || !serviceType || !message) return json(422, { message: 'missing_fields' });
  if (name.length > 80 || company.length > 120 || email.length > 254 || phone.length > 20 || employeeCount.length > 80 || message.length > 2_000) return json(413, { message: 'payload_too_large' });
  if (!EMAIL_RE.test(email)) return json(422, { message: 'invalid_email' });
  if (phone && !PHONE_RE.test(phone)) return json(422, { message: 'invalid_phone' });
  if (!SERVICES.has(serviceType)) return json(422, { message: 'invalid_service' });

  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) return json(503, { message: 'service_unavailable' });

  const emailBody = `
    <h2>Nuevo contacto desde la web GASI</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
    <p><strong>Empresa:</strong> ${escapeHtml(company)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(phone || 'No indicado')}</p>
    <p><strong>Trabajadores:</strong> ${escapeHtml(employeeCount || 'No indicado')}</p>
    <p><strong>Servicio de interés:</strong> ${escapeHtml(serviceType)}</p>
    <p><strong>Mensaje:</strong> ${escapeHtml(message).replaceAll('\n', '<br>')}</p>
  `;

  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: { email: 'coordinacion@gasisalud.com', name: 'Web GASI' },
        to: [{ email: 'coordinacion@gasisalud.com', name: 'GASI Coordinación' }],
        subject: `Nuevo contacto web: ${name} - ${company}`,
        html: emailBody
      })
    });

    if (!response.ok) {
      console.error('MailerSend delivery failed', response.status);
      return json(502, { message: 'delivery_failed' });
    }
  } catch {
    return json(503, { message: 'service_unavailable' });
  }

  return json(200, { message: 'received' });
};
