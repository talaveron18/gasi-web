import React,{useState}from'react';
import{Mail,MessageCircleMore,Phone,Send}from'lucide-react';
import{Link}from'react-router-dom';
import{toast}from'sonner';

const SERVICES=['Enfermería presencial','Apoyo médico remoto','Fisioterapia','Psicología','Formación sanitaria','Otro'];

export default function Contacto(){
 const[loading,setLoading]=useState(false),[form,setForm]=useState({name:'',company:'',email:'',phone:'',employee_count:'',service_type:'',message:'',website:'',accepts_privacy:false});
 const set=(key,value)=>setForm(prev=>({...prev,[key]:value}));
 const submit=async e=>{e.preventDefault();if(!form.accepts_privacy){toast.error('Debes aceptar la política de protección de datos.');return;}setLoading(true);try{
  const r=await fetch('/.netlify/functions/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json().catch(()=>({}));
  if(!r.ok){const map={missing_fields:'Revisa los campos obligatorios.',privacy_required:'Debes aceptar la política de protección de datos.',invalid_email:'Revisa el correo electrónico.',invalid_phone:'Revisa el teléfono.',invalid_service:'Selecciona un servicio válido.',payload_too_large:'El formulario contiene demasiado texto.',service_unavailable:'El servicio de envío no está disponible temporalmente.',delivery_failed:'No se ha podido entregar la consulta.'};throw new Error(map[d.message]||'No se ha podido enviar la consulta.');}
  toast.success('Consulta enviada a coordinación.');setForm({name:'',company:'',email:'',phone:'',employee_count:'',service_type:'',message:'',website:'',accepts_privacy:false});
 }catch(err){toast.error(err.message||'No se ha podido enviar la consulta.');}finally{setLoading(false);}};
 return <div data-testid="contacto-page">
  <section className="bg-slate-950 text-white py-20"><div className="max-w-6xl mx-auto px-6"><p className="text-cyan-300 font-semibold uppercase tracking-wide text-sm">Contacto</p><h1 className="text-4xl lg:text-6xl font-bold mt-3 max-w-4xl">Cuéntenos cómo funciona su centro y qué necesita resolver</h1><p className="text-xl text-slate-300 mt-6 max-w-3xl">No hace falta que tenga definido el servicio. Con actividad, turnos, número aproximado de trabajadores y objetivo podemos empezar a orientar la propuesta.</p></div></section>
  <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[.8fr_1.2fr] gap-12">
   <div><h2 className="text-3xl font-bold text-slate-900">Hablar con GASI</h2><p className="text-slate-600 mt-4 text-lg">Para una consulta comercial puede usar cualquiera de estos canales. No envíe información clínica o datos de salud por esta vía.</p><div className="space-y-4 mt-8">
    <a href="tel:622822101" className="flex items-center gap-4 rounded-2xl border p-5 hover:border-[#005EB8] transition-colors"><span className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Phone className="w-5 h-5"/></span><span><b className="block text-slate-900">Teléfono</b><span className="text-slate-600">622 822 101</span></span></a>
    <a href="https://wa.me/34634029865" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border p-5 hover:border-[#005EB8] transition-colors"><span className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><MessageCircleMore className="w-5 h-5"/></span><span><b className="block text-slate-900">WhatsApp</b><span className="text-slate-600">634 029 865</span></span></a>
    <a href="mailto:coordinacion@gasisalud.com" className="flex items-center gap-4 rounded-2xl border p-5 hover:border-[#005EB8] transition-colors"><span className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Mail className="w-5 h-5"/></span><span><b className="block text-slate-900">Correo</b><span className="text-slate-600">coordinacion@gasisalud.com</span></span></a>
   </div></div>
   <div className="rounded-3xl border bg-slate-50 p-7 lg:p-9"><h2 className="text-2xl font-bold text-slate-900">Solicitar información</h2><p className="text-slate-600 mt-2">Los campos marcados con * son obligatorios.</p><form onSubmit={submit} className="grid sm:grid-cols-2 gap-5 mt-7">
    <label className="text-sm font-medium text-slate-700">Nombre completo *<input required maxLength={80} value={form.name} onChange={e=>set('name',e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-4 py-3"/></label>
    <label className="text-sm font-medium text-slate-700">Empresa u organización *<input required maxLength={120} value={form.company} onChange={e=>set('company',e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-4 py-3"/></label>
    <label className="text-sm font-medium text-slate-700">Correo electrónico *<input required type="email" maxLength={254} value={form.email} onChange={e=>set('email',e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-4 py-3"/></label>
    <label className="text-sm font-medium text-slate-700">Teléfono<input type="tel" maxLength={20} value={form.phone} onChange={e=>set('phone',e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-4 py-3"/></label>
    <label className="text-sm font-medium text-slate-700">Trabajadores aproximados<input maxLength={80} value={form.employee_count} onChange={e=>set('employee_count',e.target.value)} placeholder="Ej. 150-200" className="mt-1 w-full rounded-xl border bg-white px-4 py-3"/></label>
    <label className="text-sm font-medium text-slate-700">Servicio de interés *<select required value={form.service_type} onChange={e=>set('service_type',e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-4 py-3"><option value="">Seleccionar</option>{SERVICES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label className="sm:col-span-2 text-sm font-medium text-slate-700">¿Qué necesita? *<textarea required maxLength={2000} rows={5} value={form.message} onChange={e=>set('message',e.target.value)} placeholder="Centro, turnos, objetivo, fecha prevista de inicio…" className="mt-1 w-full rounded-xl border bg-white px-4 py-3 resize-y"/></label>
    <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label>Sitio web<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>set('website',e.target.value)}/></label></div>
    <label className="sm:col-span-2 flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={form.accepts_privacy} onChange={e=>set('accepts_privacy',e.target.checked)} className="mt-1"/><span>Acepto la <Link to="/politica-privacidad" className="text-[#005EB8] hover:underline">política de protección de datos</Link> para que GASI responda a esta consulta. No enviaré información clínica o datos de salud por este formulario.</span></label>
    <button disabled={loading} className="sm:col-span-2 inline-flex justify-center items-center rounded-xl bg-[#005EB8] hover:bg-[#004a92] disabled:opacity-60 text-white font-bold px-6 py-3">{loading?'Enviando…':<>Enviar consulta <Send className="ml-2 w-4 h-4"/></>}</button>
   </form></div>
  </div></section>
 </div>;
}
