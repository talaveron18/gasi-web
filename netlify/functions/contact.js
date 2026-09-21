const {response,escapeHtml,parseBody,validateBaseLead,sendLeadEmail}=require("./public-lead-utils");

exports.handler=async event=>{
  if(event.httpMethod!=="POST")return response(405,"method_not_allowed");

  const parsed=parseBody(event);
  if(parsed.error)return parsed.error;

  const validated=validateBaseLead(parsed.data,{requireCompany:true,requireMessage:true});
  if(validated.honeypot)return response(200,"accepted");
  if(validated.error)return response(422,validated.error);

  const lead=validated.lead;
  const html=`
    <h2>Nuevo contacto desde la web GASI</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(lead.name)}</p>
    <p><strong>Empresa:</strong> ${escapeHtml(lead.company)}</p>
    <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(lead.phone)}</p>
    <p><strong>Trabajadores:</strong> ${escapeHtml(lead.employee_count||"No indicado")}</p>
    <p><strong>Servicio de interés:</strong> ${escapeHtml(lead.service)}</p>
    <p><strong>Mensaje:</strong> ${escapeHtml(lead.message)}</p>
  `;

  const delivery=await sendLeadEmail({
    subject:`Nuevo contacto web: ${lead.name} - ${lead.company}`,
    html
  });
  if(!delivery.ok)return response(delivery.code==="service_unavailable"?503:502,delivery.code);
  return response(200,"sent");
};
