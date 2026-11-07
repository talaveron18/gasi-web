import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, LoaderCircle,
  Mail, MessageCircle, Send, ShieldCheck, X
} from 'lucide-react';
import { SERVICES, TOPICS, emptyLead, interpretQuestion, composeLeadMessage } from '@/lib/chatbotGuidance';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;
const WHATSAPP = 'https://wa.me/34634029865?text=Hola%2C%20quiero%20hacer%20una%20consulta%20comercial%20a%20GASI.%20No%20incluyo%20datos%20de%20salud.';
const EMAIL = 'coordinacion@gasisalud.com';
const INPUT = 'mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8]';
const PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#005EB8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004a92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#005EB8] disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8]';
const STEPS = ['Servicio', 'Lugar y plazo', 'Empresa', 'Contacto'];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState('home');
  const [step, setStep] = useState(0);
  const [lead, setLead] = useState(emptyLead);
  const [privacy, setPrivacy] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const openerRef = useRef(null);
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const firstControlRef = useRef(null);
  const hasOpenedRef = useRef(false);

  const close = () => setOpen(false);
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      dialogRef.current?.focus();
    } else if (hasOpenedRef.current) {
      openerRef.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab' && dialogRef.current) {
        const elements = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
          .filter(node => node.getClientRects().length > 0 && node.getAttribute('tabindex') !== '-1');
        if (elements.length === 0) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      if (screen === 'wizard') firstControlRef.current?.focus();
    }
  }, [screen, step, open]);

  const pickTopic = topic => {
    setAnswer({ question: '', type: 'topic', topic, answer: topic.answer, city: '', count: '' });
    setLead(previous => ({ ...previous, service: topic.service, service_detail: topic.title, employee_count: '' }));
    setScreen('answer');
    setError('');
  };
  const askQuestion = event => {
    event.preventDefault();
    const result = interpretQuestion(question);
    if (!result) return;
    setAnswer(result);
    setQuestion('');
    if (result.type !== 'clinical') {
      setLead(previous => ({
        ...previous, service: result.topic?.service || previous.service,
        service_detail: result.topic?.title || previous.service_detail,
        employee_count: result.count || previous.employee_count,
        location: result.city || previous.location
      }));
    }
    setScreen('answer');
    setError('');
  };
  const beginProposal = () => {
    if (answer?.type === 'clinical') return;
    setScreen('wizard'); setStep(0); setError('');
  };
  const goHome = () => { setScreen('home'); setAnswer(null); setStep(0); setError(''); };
  const update = event => {
    const { name, value } = event.target;
    setLead(previous => ({ ...previous, [name]: value }));
    setError('');
  };
  const verifyStep = () => {
    if (step === 0) {
      if (!SERVICES.includes(lead.service)) return 'Selecciona uno de los servicios disponibles.';
      if (lead.employee_count && (!/^[1-9]\d{0,3}$/.test(lead.employee_count))) return 'Indica un número aproximado de 1 a 9999 personas, o déjalo vacío.';
    }
    if (step === 1) {
      if (lead.location.trim().length < 2) return 'Indica la ciudad o localidad donde necesitas el servicio.';
    }
    if (step === 2 && (lead.company.trim().length < 2 || lead.name.trim().length < 2)) {
      return 'Indica el nombre de la empresa y una persona de contacto.';
    }
    if (step === 3) {
      if (!EMAIL_RE.test(lead.email.trim())) return 'Introduce un correo electrónico válido.';
      if (lead.phone.trim() && !PHONE_RE.test(lead.phone.trim())) return 'Comprueba el número de teléfono o déjalo vacío.';
      if (!privacy) return 'Debes aceptar la política de privacidad antes de enviar la solicitud.';
    }
    return '';
  };
  const next = () => {
    const issue = verifyStep();
    if (issue) { setError(issue); return; }
    setStep(previous => Math.min(3, previous + 1));
    setError('');
  };
  const sendProposal = async event => {
    event.preventDefault();
    if (sending) return;
    const issue = verifyStep();
    if (issue) { setError(issue); return; }
    setSending(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/.netlify/functions/chatbot', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          service_detail: lead.service_detail.slice(0, 120),
          timeframe: lead.timeframe.slice(0, 100),
          employee_count: lead.employee_count ? lead.employee_count + ' personas' : '',
          message: composeLeadMessage(lead, answer?.question),
          accepts_privacy: privacy
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.message !== 'sent') {
        const reasons = {
          missing_fields: 'Faltan datos obligatorios.',
          invalid_email: 'Revisa el correo electrónico.',
          invalid_phone: 'Revisa el teléfono.',
          invalid_service: 'Selecciona un servicio disponible.',
          privacy_required: 'Debes aceptar la política de privacidad.',
          payload_too_large: 'La consulta contiene demasiado texto.',
          service_unavailable: 'El correo automático no está configurado.',
          delivery_failed: 'El proveedor de correo no ha aceptado el envío.',
          medical_content_not_allowed: 'No envíes información clínica ni datos de salud por este canal.'
        };
        throw new Error(reasons[result.message] || 'No se ha podido confirmar el envío.');
      }
      setScreen('sent');
      setPrivacy(false);
      setLead(emptyLead);
    } catch (cause) {
      setError(cause?.name === 'AbortError'
        ? 'El envío ha tardado demasiado y no se ha podido confirmar.'
        : (cause?.message || 'No hay conexión con el servicio de envío.') +
          ' No se ha confirmado el envío. Puedes escribir a coordinacion@gasisalud.com sin incluir datos clínicos ni de salud.');
    } finally {
      clearTimeout(timeout);
      setSending(false);
    }
  };

  return <>
    <button ref={openerRef} hidden={open} type="button" aria-label="Abrir asistente GASI"
      data-testid="chatbot-open-button" onClick={() => setOpen(true)}
      className={(open ? 'hidden' : 'flex') + " fixed bottom-4 right-4 z-50 items-center gap-2 rounded-full bg-[#005EB8] px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#004a92] focus-visible:ring-4 focus-visible:ring-blue-300"}>
      <MessageCircle aria-hidden="true" size={21}/><span>¿Te ayudamos?</span>
    </button>
    {open && <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true"
      aria-labelledby="assistant-heading" data-testid="chatbot-window"
      className="fixed inset-x-2 bottom-2 top-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[min(440px,calc(100vw-2rem))]">
      <header className="flex items-center justify-between bg-[#005EB8] px-4 py-3 text-white sm:px-5 sm:py-4">
        <div className="flex items-center gap-3"><span className="rounded-lg bg-white/15 p-2"><MessageCircle size={21} aria-hidden="true"/></span>
          <div><h2 id="assistant-heading" className="font-bold">Asistente GASI</h2>
            <p className="text-xs text-blue-100">Información comercial · Respuesta automática</p></div>
        </div>
        <button onClick={close} type="button" aria-label="Cerrar asistente GASI" className="rounded-lg p-2 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"><X size={20}/></button>
      </header>

      <div ref={scrollRef} data-testid="chatbot-messages" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5" aria-live="polite" aria-relevant="additions text">
        {screen === 'home' && <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
            Hola. Puedo orientarte sobre los servicios de GASI y recoger los datos para estudiar una propuesta adaptada a tu empresa.
            <p className="mt-2 text-xs text-slate-500">Este asistente no es un canal clínico ni de urgencias. No compartas datos de pacientes ni información de salud.</p>
          </div>
          <p className="text-sm font-semibold text-slate-800">¿En qué podemos ayudarte?</p>
          <div className="grid gap-2">{TOPICS.map(topic => <button type="button" key={topic.id} onClick={() => pickTopic(topic)}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-800 hover:border-[#005EB8] hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-[#005EB8]">
            {topic.title}<ArrowRight size={17} aria-hidden="true" className="shrink-0 text-[#005EB8]"/></button>)}</div>
          <button type="button" onClick={beginProposal} className={PRIMARY + ' w-full'} data-testid="chatbot-start-proposal">Solicitar una propuesta <ArrowRight size={16} aria-hidden="true"/></button>
          <form onSubmit={askQuestion} className="space-y-2">
            <label htmlFor="gasi-question" className="block text-sm font-semibold text-slate-800">O haz una pregunta</label>
            <div className="flex gap-2"><input id="gasi-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={300}
              placeholder="Ej.: RCP para 20 empleados en Madrid" className={INPUT + ' mt-0 flex-1'}/>
              <button aria-label="Enviar pregunta" disabled={!question.trim()} className={PRIMARY + ' px-3'} type="submit"><Send size={17}/></button></div>
            <p className="text-xs text-slate-500">Las respuestas se basan en los servicios publicados. No confirmamos precios ni disponibilidad automáticamente.</p>
          </form>
        </>}

        {screen === 'answer' && <>
          <button onClick={goHome} type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-[#005EB8]"><ChevronLeft size={16}/> Volver</button>
          {answer?.question && <div className="ml-10 rounded-2xl bg-[#005EB8] p-3 text-sm text-white">{answer.question}</div>}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">{answer?.answer}</div>
          {answer?.type !== 'clinical' && <>
            {answer?.type === 'price' && (answer.count || answer.city) && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" data-testid="chatbot-prefill">
              Datos reconocidos: {[answer.count && answer.count + ' personas', answer.city].filter(Boolean).join(' · ')}. Podrás corregirlos antes de enviar.
            </div>}
            {answer?.topic?.url && <Link to={answer.topic.url} onClick={close} className="inline-flex items-center gap-2 text-sm font-semibold text-[#005EB8] underline">
              Ver información del servicio <ArrowRight size={16} aria-hidden="true"/></Link>}
            <button type="button" onClick={beginProposal} className={PRIMARY + ' w-full'} data-testid="chatbot-start-proposal">Preparar solicitud en 4 pasos <ArrowRight size={16}/></button>
          </>}
          {answer?.type === 'clinical' && <a className={SECONDARY + ' w-full'} href="tel:112">Llamar al 112 (España)</a>}
        </>}

        {screen === 'wizard' && <>
          <button type="button" onClick={goHome} className="inline-flex items-center gap-1 text-sm font-semibold text-[#005EB8]"><ChevronLeft size={16}/> Volver al asistente</button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#005EB8]" data-testid="chatbot-proposal-step">Paso {step + 1} de 4</p>
            <div className="mt-2 grid grid-cols-4 gap-1" aria-label="Progreso de la solicitud">{STEPS.map((title, index) => <span
              key={title} aria-current={index === step ? 'step' : undefined} className={'h-1.5 rounded-full ' + (index <= step ? 'bg-[#005EB8]' : 'bg-slate-200')}/>)}</div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">{STEPS[step]}</h3>
            <p className="mt-1 text-sm text-slate-600">La solicitud es orientativa y no confirma precio, contratación ni disponibilidad.</p>
          </div>
          <form id="gasi-proposal-form" data-testid="chatbot-lead-form" onSubmit={event => {event.preventDefault(); if (step === 3) sendProposal(event); else next();}} className="space-y-4">
            {step === 0 && <>
              <label className="block text-sm font-semibold text-slate-800">Servicio *<select ref={firstControlRef} name="service" required value={lead.service} onChange={update} className={INPUT} data-testid="chatbot-service">
                {SERVICES.map(service => <option key={service} value={service}>{service}</option>)}</select></label>
              <label className="block text-sm font-semibold text-slate-800">Actividad o necesidad concreta
                <input name="service_detail" value={lead.service_detail} onChange={update} maxLength={120} placeholder="Ej.: curso de RCP/DEA" className={INPUT}/></label>
              <label className="block text-sm font-semibold text-slate-800">Número aproximado de personas
                <input name="employee_count" inputMode="numeric" pattern="[1-9][0-9]{0,3}" value={lead.employee_count}
                  onChange={update} placeholder="Ej.: 20" maxLength={4} className={INPUT} data-testid="chatbot-participants"/></label>
            </>}
            {step === 1 && <>
              <label className="block text-sm font-semibold text-slate-800">Ciudad o localidad *<input ref={firstControlRef} name="location" required minLength={2} maxLength={120} value={lead.location}
                onChange={update} placeholder="Ej.: Madrid" className={INPUT} data-testid="chatbot-city"/></label>
              <label className="block text-sm font-semibold text-slate-800">Plazo orientativo
                <input name="timeframe" maxLength={100} value={lead.timeframe} onChange={update} placeholder="Ej.: antes de febrero, aún sin fecha" className={INPUT}/></label>
              <label className="block text-sm font-semibold text-slate-800">Otros detalles comerciales (opcional)
                <textarea name="message" rows={3} maxLength={800} value={lead.message} onChange={update}
                  placeholder="Horario, tipo de equipo, duración aproximada…" className={INPUT + ' resize-y'}/></label>
            </>}
            {step === 2 && <>
              <label className="block text-sm font-semibold text-slate-800">Empresa u organización *<input ref={firstControlRef} autoComplete="organization" name="company" required minLength={2} maxLength={120}
                value={lead.company} onChange={update} className={INPUT} data-testid="chatbot-company"/></label>
              <label className="block text-sm font-semibold text-slate-800">Persona de contacto *<input autoComplete="name" name="name" required minLength={2} maxLength={80}
                value={lead.name} onChange={update} className={INPUT} data-testid="chatbot-contact-name"/></label>
            </>}
            {step === 3 && <>
              <label className="block text-sm font-semibold text-slate-800">Correo electrónico *<input ref={firstControlRef} autoComplete="email" type="email" name="email" required maxLength={254}
                value={lead.email} onChange={update} className={INPUT} data-testid="chatbot-email"/></label>
              <label className="block text-sm font-semibold text-slate-800">Teléfono (opcional)<input autoComplete="tel" type="tel" name="phone" maxLength={20}
                value={lead.phone} onChange={update} className={INPUT} data-testid="chatbot-phone"/></label>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                <p className="font-semibold text-slate-900">Resumen de la consulta</p>
                <p className="mt-1">{lead.service}{lead.employee_count ? ' · ' + lead.employee_count + ' personas' : ''}{lead.location ? ' · ' + lead.location : ''}</p>
                <p>{lead.company}{lead.timeframe ? ' · ' + lead.timeframe : ''}</p>
              </div>
              <div className="hidden" aria-hidden="true"><label>Dejar en blanco<input name="website" tabIndex={-1} autoComplete="off" value={lead.website} onChange={update}/></label></div>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                <input type="checkbox" data-testid="chatbot-privacy-checkbox" checked={privacy} onChange={event => {setPrivacy(event.target.checked);setError('');}}
                  required className="mt-1"/>
                <span>Acepto la <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#005EB8] underline">política de protección de datos</a> para gestionar esta consulta comercial. No enviaré datos clínicos o de salud.</span>
              </label>
            </>}
            <p className="sr-only" aria-live="polite">{error}</p>
            {error && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="chatbot-error">{error}</p>}
            <div className="flex items-center gap-2">
              {step > 0 && <button type="button" disabled={sending} onClick={() => {setStep(previous => previous - 1);setError('');}} className={SECONDARY + ' min-w-0 flex-1'}><ArrowLeft size={16}/> Atrás</button>}
              <button disabled={sending} type="submit" data-testid={step === 3 ? 'chatbot-send-button' : 'chatbot-next-button'} className={PRIMARY + ' min-w-0 flex-1'}>
                {step === 3 ? (sending ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> Enviando solicitud…</> : <>Enviar consulta <Send size={16}/></>) : <>Continuar <ArrowRight size={16}/></>}
              </button>
            </div>
            {sending && <p role="status" aria-live="polite" className="text-center text-xs text-slate-500">Estamos conectando con el servicio de correo.</p>}
          </form>
        </>}

        {screen === 'sent' && <div role="status" data-testid="chatbot-confirmation" className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 text-slate-800">
          <CheckCircle2 className="text-emerald-600" size={37} aria-hidden="true"/>
          <h3 className="text-xl font-bold">Solicitud aceptada para envío</h3>
          <p className="text-sm leading-relaxed">El servicio de correo ha aceptado tu consulta. Esto no confirma su entrega al buzón ni la contratación de un servicio. Si no recibes respuesta, escribe a coordinacion@gasisalud.com.</p>
          <button onClick={goHome} type="button" className="text-sm font-semibold text-[#005EB8] underline">Hacer otra consulta</button>
        </div>}
      </div>
      <footer className="space-y-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600"><ShieldCheck size={14} className="text-[#005EB8]"/> Solo consultas comerciales</span>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#005EB8]" data-testid="chatbot-human-handoff">
            Hablar con una persona <ArrowRight size={14}/></a>
        </div>
        <a href={'mailto:' + EMAIL} className="inline-flex items-center gap-1 text-xs font-semibold text-[#005EB8]"><Mail size={14}/> Correo directo: {EMAIL}</a>
      </footer>
    </section>}
  </>;
}
