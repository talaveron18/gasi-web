const {response,escapeHtml,parseBody,validateBaseLead,sendLeadEmail}=require("./public-lead-utils");

exports.handler=async event=>{
  if(event.httpMethod!=="POST")return response(405,"method_not_allowed");

  const parsed=parseBody(event,4096);
  if(parsed.error)return parsed.error;

  const validated=validateBaseLead(parsed.data);
  if(validated.honeypot)return response(200,"accepted");
  if(validated.error)return response(422,validated.error);

  const lead=validated.lead;
  const html=`
    <h2>Nuevo lead desde el asistente GASI</h2>
    <p><strong>Servicio:</strong> ${escapeHtml(lead.service)}</p>
    <p><strong>Nombre:</strong> ${escapeHtml(lead.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(lead.phone)}</p>
    <p><em>El asistente público no admite contenido clínico ni datos de salud.</em></p>
  `;

  const delivery=await sendLeadEmail({
    subject:`Nuevo lead web: ${lead.service}`,
    html
  });
  if(!delivery.ok)return response(delivery.code==="service_unavailable"?503:502,delivery.code);
  return response(200,"sent");
};
