// Only describe the two service families already published by GASI.
// No prices, availability or professional certification are invented here.
export const SERVICES = ['Enfermería presencial', 'Formación sanitaria', 'Otro'];
export const TOPICS = [
  {
    id: 'enfermeria', title: 'Enfermería en empresas', service: SERVICES[0],
    url: '/cobertura-sanitaria',
    answer: 'Estudiamos propuestas de enfermería presencial para organizaciones. Las funciones, horarios y recursos se definen con cada centro tras valorar la viabilidad, la disponibilidad efectiva y los requisitos aplicables.'
  },
  {
    id: 'rcp', title: 'RCP, DEA y primeros auxilios', service: SERVICES[1],
    url: '/formacion-sanitaria',
    answer: 'Ofrecemos propuestas de formación práctica para equipos en primeros auxilios, reanimación cardiopulmonar, soporte vital básico y utilización de desfibriladores. El contenido y formato se revisan con la organización.'
  },
  {
    id: 'formacion', title: 'Formación para equipos', service: SERVICES[1],
    url: '/formacion-sanitaria',
    answer: 'Recogemos el objetivo, los destinatarios y el contexto de la organización, y revisamos qué contenido y formato formativos pueden resultar aplicables. Las fechas y condiciones se confirman después de esa valoración.'
  },
  {
    id: 'cobertura', title: 'Cobertura sanitaria en el centro', service: SERVICES[0],
    url: '/cobertura-sanitaria',
    answer: 'Antes de iniciar una cobertura definimos con la organización el centro, los horarios, las funciones y los medios necesarios. La prestación se ajusta al alcance acordado y a los requisitos profesionales y sanitarios aplicables.'
  }
];
export const emptyLead = {
  service: 'Formación sanitaria', service_detail: '', company: '', name: '', email: '',
  phone: '', employee_count: '', location: '', timeframe: '', message: '', website: ''
};

const PLACE_NAMES = ['Madrid','Barcelona','Valencia','Sevilla','Murcia','Zaragoza','Málaga','Bilbao','Alicante','Valladolid','Córdoba','Granada','Toledo','Vigo','A Coruña','Palma','Oviedo'];
const quoteRe = /\b(?:precio|tarifa|presupuesto|coste|cu[aá]nto\s+cuesta|cotizaci[oó]n)\b/i;
const trainingRe = /\b(?:curso|cursos|rcp|dea|desfibrilador(?:es)?|primeros\s+auxilios|formaci[oó]n|soporte\s+vital)\b/i;
const coverageRe = /\b(?:enfermer[ií]a|enfermer[oa]s?|cobertura|asistencia\s+sanitaria|presencia\s+sanitaria)\b/i;
const emergencyRe = /\b(?:urgencia(?:s)?|emergencia(?:s)?|paciente(?:s)?|s[ií]ntoma(?:s)?|diagn[oó]stico|tratamiento|historia\s+cl[ií]nica|mi\s+medicaci[oó]n)\b/i;

export function interpretQuestion(input) {
  const question = String(input || '').trim().slice(0, 300);
  if (!question) return null;
  const emergency = emergencyRe.test(question);
  if (emergency) return {
    type: 'clinical', topic: null, count: '', city: '', question: '',
    answer: 'Este asistente no es un canal clínico ni de urgencias. En España, ante una emergencia, llama al 112. No envíes datos de pacientes ni información de salud. Para consultas comerciales puedes usar el correo o WhatsApp.'
  };
  const asksForPrice = quoteRe.test(question);
  const topic = trainingRe.test(question) ? TOPICS[1] : coverageRe.test(question) ? TOPICS[0] : null;
  const amount = question.match(/\b([1-9]\d{0,3})\s*(?:personas?|participantes?|emplead[oa]s?|trabajadores?)\b/i);
  const city = PLACE_NAMES.find(name => new RegExp('\\b' + name + '\\b', 'i').test(question)) || '';
  const count = amount ? amount[1] : '';
  const detail = topic?.id === 'rcp' ? 'curso de RCP y DEA' : topic?.service === SERVICES[0] ? 'cobertura de enfermería' : 'servicio';
  const circumstances = [count ? 'para ' + count + ' personas' : '', city ? 'en ' + city : ''].filter(Boolean).join(' ');
  const answer = asksForPrice
    ? 'Podemos estudiar una propuesta de ' + detail + (circumstances ? ' ' + circumstances : '') + '. GASI no publica una tarifa cerrada: la disponibilidad y las condiciones se confirman tras revisar el alcance, la ubicación y las fechas. Puedes preparar la solicitud con estos datos ya incorporados.'
    : topic ? topic.answer
      : 'Puedo orientarte sobre enfermería presencial y formación sanitaria para empresas. Si necesitas condiciones concretas, puedo recoger los datos comerciales para que el equipo de GASI estudie una propuesta.';
  return { type: asksForPrice ? 'price' : 'general', topic, count, city, question, answer };
}

export function composeLeadMessage(lead, originalQuestion) {
  const lines = [];
  if (originalQuestion) lines.push('Pregunta original: ' + String(originalQuestion).slice(0, 300));
  if (lead.service_detail) lines.push('Actividad solicitada: ' + String(lead.service_detail).slice(0, 120));
  if (lead.timeframe) lines.push('Plazo orientativo: ' + String(lead.timeframe).slice(0, 100));
  if (lead.message) lines.push('Detalles comerciales: ' + String(lead.message).slice(0, 800));
  return lines.join(' | ').slice(0, 1400);
}
