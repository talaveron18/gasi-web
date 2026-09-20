const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE=/^[+()\d\s.-]{7,20}$/;
const SERVICES=new Set([
  "Enfermería presencial",
  "Apoyo médico remoto",
  "Fisioterapia",
  "Psicología",
  "Formación sanitaria",
  "Otro"
]);

const response=(statusCode,message)=>({
  statusCode,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"},
  body:JSON.stringify({message})
});

const text=(value,max)=>String(value??"").trim().slice(0,max);

const escapeHtml=value=>String(value??"")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#39;");

function parseBody(event,maxBytes=8192){
  const raw=event?.body||"";
  if(Buffer.byteLength(raw,"utf8")>maxBytes)return{error:response(413,"payload_too_large")};
  try{
    const data=JSON.parse(raw);
    if(!data||typeof data!=="object"||Array.isArray(data))return{error:response(400,"invalid_json")};
    return{data};
  }catch{
    return{error:response(400,"invalid_json")};
  }
}

function validateBaseLead(raw,{requireCompany=false,requireMessage=false}={}){
  if(raw.accepts_privacy!==true)return{error:"privacy_required"};
  if(text(raw.website,200))return{honeypot:true};
  const lead={
    name:text(raw.name,80),
    company:text(raw.company,120),
    email:text(raw.email,254).toLowerCase(),
    phone:text(raw.phone,20),
    service:text(raw.service||raw.service_type,80),
    employee_count:text(raw.employee_count,80),
    message:text(raw.message,2000)
  };
  if(!lead.name||!lead.email||!lead.phone||!lead.service)return{error:"missing_fields"};
  if(requireCompany&&!lead.company)return{error:"missing_fields"};
  if(requireMessage&&!lead.message)return{error:"missing_fields"};
  if(!EMAIL_RE.test(lead.email))return{error:"invalid_email"};
  if(!PHONE_RE.test(lead.phone))return{error:"invalid_phone"};
  if(!SERVICES.has(lead.service))return{error:"invalid_service"};
  return{lead};
}

async function sendLeadEmail({subject,html}){
  const apiKey=process.env.MAILERSEND_API_KEY||"";
  const sender=process.env.GASI_LEAD_SENDER_EMAIL||"coordinacion@gasisalud.com";
  const recipient=process.env.GASI_LEAD_RECIPIENT_EMAIL||"coordinacion@gasisalud.com";
  if(!apiKey)return{ok:false,code:"service_unavailable"};
  let upstream;
  try{
    upstream=await fetch("https://api.mailersend.com/v1/email",{
      method:"POST",
      headers:{"content-type":"application/json","authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({
        from:{email:sender,name:"Web GASI"},
        to:[{email:recipient,name:"GASI Coordinación"}],
        subject,
        html
      })
    });
  }catch{
    return{ok:false,code:"delivery_failed"};
  }
  if(!upstream.ok){
    console.error("lead_delivery_failed",{provider:"mailersend",status:upstream.status});
    return{ok:false,code:"delivery_failed"};
  }
  return{ok:true};
}

module.exports={SERVICES,response,text,escapeHtml,parseBody,validateBaseLead,sendLeadEmail};
