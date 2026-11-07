import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronLeft, Mail, MessageCircle, Send, ShieldCheck, X } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;
const SERVICES = ['Enfermería presencial', 'Formación sanitaria', 'Otro'];
const TOPICS = [
  { id: 'enfermeria', title: 'Enfermería en empresas', service: SERVICES[0], url: '/cobertura-sanitaria',
    description: 'Estudiamos la presencia de enfermería en instalaciones empresariales y definimos el alcance, los horarios y los medios necesarios. Cada propuesta requiere una valoración previa.' },
  { id: 'formacion', title: 'Formación en RCP y DEA', service: SERVICES[1], url: '/formacion-sanitaria',
    description: 'Formación práctica para organizaciones en primeros auxilios, reanimación cardiopulmonar y uso del desfibrilador. Adaptamos la propuesta al grupo, la ubicación y los objetivos.' },
  { id: 'presupuesto', title: 'Solicitar una propuesta', service: SERVICES[2], url: '/contacto',
    description: 'Para preparar una propuesta necesitamos conocer la empresa, la ubicación, el servicio que buscas y una vía de contacto. No facilitamos precios ni disponibilidad sin comprobar las condiciones.' },
  { id: 'otras', title: 'Otras consultas', service: SERVICES[2], url: '/contacto',
    description: 'Si tu consulta no encaja en estas opciones, podemos trasladarla al equipo comercial. Este asistente no presta asesoramiento clínico ni gestiona urgencias.' }
];
const initialLead = { service: SERVICES[2], name: '', company: '', email: '', phone: '', location: '', employee_count: '', message: '', website: '' };
const assist = (question) => {
  const q = question.toLowerCase();
  if (/urgencia|emergencia médica|paciente|síntoma|diagnóstic|tratamiento|historia clínica|medicaci[oó]n/.test(q))
    return 'Este asistente no es un canal clínico ni de urgencias. No envíes datos de salud. Ante una urgencia, contacta con el servicio de emergencias correspondiente.';
  if (/precio|tarifa|presupuesto|coste|cu[aá]nto/.test(q))
    return 'El precio depende del servicio, la ubicación, la duración y el número de participantes o el alcance de la cobertura. Podemos estudiar tu caso sin comprometernos a una tarifa antes de revisarlo.';
  if (/curso|formaci[oó]n|rcp|dea|desfibrilador|primeros auxilios/.test(q))
    return TOPICS[1].description;
  if (/enfermer|cobertura|asistencia sanitaria|empresa|centro de trabajo/.test(q))
    return TOPICS[0].description;
  if (/horario|disponibilidad|provincia|ciudad|madrid|valencia|murcia|españa/.test(q))
    return 'Trabajamos con solicitudes de organizaciones en España. La disponibilidad y el alcance deben confirmarse para cada ubicación y fecha.';
  if (/contacto|correo|tel[eé]fono|hablar con/.test(q))
    return 'Puedes escribirnos a coordinacion@gasisalud.com o dejarnos tus datos mediante la opción «Solicitar información». No compartas datos de salud.';
  return 'No tengo una respuesta verificada para esa consulta. Puedes solicitar información y el equipo comercial podrá estudiarla; este asistente no inventa condiciones ni disponibilidad.';
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('inicio');
  const [selected, setSelected] = useState(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(null);
  const [lead, setLead] = useState(initialLead);
  const [privacy, setPrivacy] = useState(false);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const closeButton = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const escape = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);
  const close = () => { setOpen(false); opener.current?.focus(); };
  const reset = () => { setView('inicio'); setSelected(null); setAsked(null); setQuestion(''); setStatus(''); };

  const pick = topic => {
    setSelected(topic);
    setLead(previous => ({ ...previous, service: topic.service }));
    setView('informacion');
    setStatus('');
  };
  const ask = event => {
    event.preventDefault();
    const value = question.trim().slice(0, 300);
    if (!value) return;
    setAsked({ question: value, answer: assist(value) });
    setQuestion('');
    setView('respuesta');
  };
  const edit = event => {
    const { name, value } = event.target;
    setLead(previous => ({ ...previous, [name]: value }));
  };
  const submit = async event => {
    event.preventDefault();
    if (sending) return;
    setStatus('');
    if (!privacy) { setStatus('Acepta la política de privacidad para enviar tu consulta.'); return; }
    if (lead.name.trim().length < 2 || !lead.company.trim() || !EMAIL_RE.test(lead.email.trim()) || (lead.phone.trim() && !PHONE_RE.test(lead.phone.trim()))) {
      setStatus('Comprueba el nombre, la empresa, el correo electrónico y, si lo has indicado, el teléfono.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/.netlify/functions/chatbot', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...lead, accepts_privacy: privacy })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.message !== 'sent') {
        const reasons = {
          service_unavailable: 'El servicio de envío no está configurado temporalmente.',
          delivery_failed: 'No se ha podido enviar la consulta.',
          invalid_service: 'Selecciona un servicio válido.',
          invalid_email: 'Comprueba tu correo electrónico.',
          invalid_phone: 'Comprueba el número de teléfono.',
          missing_fields: 'Completa los campos obligatorios.',
          privacy_required: 'Debes aceptar la política de privacidad.',
          payload_too_large: 'La consulta supera el límite permitido.'
        };
        throw new Error(reasons[result.message] || 'No hemos podido registrar la consulta.');
      }
      setView('enviado');
      setStatus('');
      setLead(initialLead);
      setPrivacy(false);
    } catch (error) {
      setStatus((error?.message || 'No se ha podido contactar con el servicio.') +
        ' Puedes escribir a coordinacion@gasisalud.com sin incluir datos clínicos ni de salud.');
    } finally {
      setSending(false);
    }
  };
  const startForm = () => { setView('formulario'); setStatus(''); };

  return <>
    {!open && <button ref={opener} type="button" data-testid="chatbot-open-button" aria-label="Abrir asistente GASI"
      onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#005EB8] px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#004a92] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300">
      <MessageCircle aria-hidden="true" size={21} /><span>¿Te ayudamos?</span>
    </button>}
    {open && <section role="dialog" aria-modal="true" aria-labelledby="gasi-assistant-title"
      data-testid="chatbot-window" className="fixed bottom-3 right-3 z-50 flex h-[min(670px,calc(100dvh-1.5rem))] w-[min(430px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-[#005EB8] px-5 py-4 text-white">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2"><MessageCircle size={22} aria-hidden="true" /></span>
          <div><h2 id="gasi-assistant-title" className="font-bold">Asistente GASI</h2><p className="text-xs text-blue-100">Información y atención comercial automática</p></div>
        </div>
        <button ref={closeButton} type="button" onClick={close} aria-label="Cerrar asistente GASI"
          className="rounded-lg p-2 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={20} /></button>
      </header>
      <div data-testid="chatbot-messages" className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-5" aria-live="polite">
        {view === 'inicio' && <>
          <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
            Hola. Soy el asistente automático de GASI. Puedo orientarte sobre nuestros servicios para empresas y ayudarte a solicitar información.
            <p className="mt-2 text-xs text-slate-500">No es un canal clínico ni de urgencias. No compartas información de pacientes ni datos de salud.</p>
          </div>
          <p className="text-sm font-semibold text-slate-800">¿Qué necesitas?</p>
          <div className="grid gap-2">{TOPICS.map(topic => <button key={topic.id} type="button" onClick={() => pick(topic)}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-800 hover:border-[#005EB8] hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-[#005EB8]">
            {topic.title}<ArrowRight size={17} className="text-[#005EB8]" aria-hidden="true" /></button>)}</div>
          <form onSubmit={ask} className="space-y-2">
            <label htmlFor="assistant-question" className="text-sm font-semibold text-slate-800">O escribe una pregunta general</label>
            <div className="flex gap-2"><input id="assistant-question" value={question} onChange={e => setQuestion(e.target.value)}
              maxLength={300} placeholder="Por ejemplo, ¿dónde impartís cursos?" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#005EB8]" />
              <button type="submit" disabled={!question.trim()} aria-label="Consultar" className="rounded-xl bg-[#005EB8] px-3 text-white disabled:opacity-40"><Send size={18} /></button>
            </div>
            <p className="text-xs text-slate-500">Ofrezco respuestas generales verificadas, no atención humana en directo.</p>
          </form>
        </>}
        {(view === 'informacion' || view === 'respuesta') && <>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-semibold text-[#005EB8]"><ChevronLeft size={16} /> Volver a opciones</button>
          {view === 'informacion' ? <>
            <div className="rounded-xl bg-[#005EB8] p-3 text-sm font-medium text-white">{selected?.title}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">{selected?.description}</div>
            <Link to={selected?.url || '/contacto'} onClick={close} className="inline-flex items-center gap-2 text-sm font-semibold text-[#005EB8] underline">Ver información del servicio <ArrowRight size={16} /></Link>
          </> : <>
            <div className="ml-10 rounded-2xl bg-[#005EB8] p-4 text-sm text-white">{asked?.question}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">{asked?.answer}</div>
          </>}
          <button onClick={startForm} type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005EB8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004a92]">Solicitar información <ArrowRight size={16} /></button>
        </>}
        {view === 'formulario' && <>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-semibold text-[#005EB8]"><ChevronLeft size={16} /> Volver a opciones</button>
          <div><h3 className="text-xl font-bold text-slate-900">Cuéntanos qué necesitas</h3><p className="mt-1 text-sm text-slate-600">Solo solicitamos datos comerciales de contacto. Los campos con * son obligatorios.</p></div>
          <form id="gasi-lead-form" onSubmit={submit} className="space-y-3" data-testid="chatbot-lead-form">
            <label className="block text-sm font-medium text-slate-800">Servicio *<select name="service" required value={lead.service} onChange={edit}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5">
              {SERVICES.map(service => <option key={service} value={service}>{service}</option>)}
            </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-800">Nombre *<input name="name" autoComplete="name" required minLength={2} maxLength={80} value={lead.name} onChange={edit} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
              <label className="block text-sm font-medium text-slate-800">Empresa *<input name="company" autoComplete="organization" required maxLength={120} value={lead.company} onChange={edit} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
            </div>
            <label className="block text-sm font-medium text-slate-800">Correo de contacto *<input name="email" autoComplete="email" type="email" required maxLength={254} value={lead.email} onChange={edit} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-800">Teléfono (opcional)<input name="phone" autoComplete="tel" type="tel" maxLength={20} value={lead.phone} onChange={edit} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
              <label className="block text-sm font-medium text-slate-800">Localidad (opcional)<input name="location" maxLength={120} value={lead.location} onChange={edit} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
            </div>
            <label className="block text-sm font-medium text-slate-800">Trabajadores o participantes (opcional)<input name="employee_count" maxLength={80} value={lead.employee_count} onChange={edit} placeholder="Ej.: 20 participantes" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
            <label className="block text-sm font-medium text-slate-800">¿En qué podemos ayudarte?<textarea name="message" rows={3} maxLength={1000} value={lead.message} onChange={edit} placeholder="Servicio, ubicación, fechas aproximadas..." className="mt-1 w-full resize-y rounded-lg border border-slate-300 p-2.5" /></label>
            <div className="hidden" aria-hidden="true"><label>Dejar en blanco<input name="website" tabIndex={-1} autoComplete="off" value={lead.website} onChange={edit} /></label></div>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"><input data-testid="chatbot-privacy-checkbox" type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} required className="mt-1" />
              <span>Acepto la <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#005EB8] underline">política de protección de datos</a> para gestionar mi solicitud. No enviaré datos clínicos o de salud.</span>
            </label>
            {status && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{status}</p>}
            <button type="submit" data-testid="chatbot-send-button" disabled={sending || !privacy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005EB8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004a92] disabled:opacity-50">{sending ? 'Enviando solicitud…' : 'Enviar consulta'} <Send size={16} /></button>
          </form>
        </>}
        {view === 'enviado' && <div role="status" className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-6 text-slate-800">
          <CheckCircle2 size={38} className="text-emerald-600" aria-hidden="true" />
          <h3 className="text-xl font-bold">Solicitud registrada para envío</h3>
          <p className="text-sm leading-relaxed">El servicio de correo ha aceptado tu consulta. Esto no confirma su entrega al buzón ni supone la aceptación de un servicio. Si no recibes respuesta, escribe a coordinacion@gasisalud.com.</p>
          <button type="button" onClick={reset} className="text-sm font-semibold text-[#005EB8] underline">Hacer otra consulta</button>
        </div>}
      </div>
      <footer className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#005EB8]" /> Solo atención comercial</span>
          <a href="mailto:coordinacion@gasisalud.com" className="flex items-center gap-1 font-semibold text-[#005EB8]"><Mail size={14} /> Correo directo</a></div>
      </footer>
    </section>}
  </>;
}
