import React,{useState}from'react';
import{Mail,MessageCircle,Phone,Send}from'lucide-react';
import{Link}from'react-router-dom';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Textarea}from'@/components/ui/textarea';
import{Checkbox}from'@/components/ui/checkbox';
import{toast}from'sonner';

export default function Contacto(){
 const[loading,setLoading]=useState(false),[formData,setFormData]=useState({name:'',company:'',email:'',phone:'',employee_count:'',service_type:'',message:'',website:'',accepts_privacy:false});
 const set=(k,v)=>setFormData(p=>({...p,[k]:v}));
 const submit=async e=>{e.preventDefault();if(!formData.accepts_privacy){toast.error('Debe aceptar la política de protección de datos.');return;}setLoading(true);try{
  const r=await fetch('/.netlify/functions/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});const d=await r.json().catch(()=>({}));
  if(!r.ok){const map={missing_fields:'Revise los campos obligatorios.',privacy_required:'Debe aceptar la política de privacidad.',invalid_email:'Revise el correo electrónico.',invalid_phone:'Revise el teléfono.',invalid_service:'Seleccione un servicio válido.',payload_too_large:'El formulario contiene demasiado texto.',service_unavailable:'El servicio de envío no está disponible temporalmente.',delivery_failed:'No se ha podido entregar la consulta.'};throw new Error(map[d.message]||'No se ha podido enviar el formulario.');}
  toast.success('Consulta enviada a coordinación.');setFormData({name:'',company:'',email:'',phone:'',employee_count:'',service_type:'',message:'',website:'',accepts_privacy:false});
 }catch(err){toast.error(err.message||'No se ha podido enviar la consulta.');}finally{setLoading(false);}};

 return <div data-testid="contacto-page">
  <section className="bg-slate-950 text-white py-20"><div className="max-w-6xl mx-auto px-6"><p className="text-cyan-300 font-semibold uppercase tracking-wide text-sm">Contacto</p><h1 className="text-4xl lg:text-6xl font-bold mt-3 max-w-4xl">Cuéntenos cómo funciona su centro y qué necesita resolver</h1><p className="text-xl text-slate-300 mt-6 max-w-3xl">No hace falta llegar con el servicio definido. Si nos explica la operativa, podemos orientar qué cobertura tendría sentido estudiar.</p></div></section>
  <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[.8fr_1.2fr] gap-12">
   <div><p className="text-[#005EB8] font-semibold uppercase text-sm tracking-wide">Coordinación GASI</p><h2 className="text-3xl font-bold text-slate-900 mt-2">Canales de contacto</h2><p className="text-slate-600 mt-4">Este canal es comercial y corporativo. No envíe datos clínicos, historias, diagnósticos ni información de salud.</p><div className="space-y-4 mt-8">
    <a href="tel:622822101" className="flex items-center gap-4 rounded-2xl border p-5 hover:border-[#005EB8] transition-colors"><span className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Phone className="w-5 h-5"/></span><span><b className="block text-slate-900">Teléfono</b><span className="text-slate-600">622 822 101</span></span></a>
    <a href="https://wa.me/34634029865" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border p-5 hover:border-[#005EB8] transition-colors"><span className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><MessageCircle className="w-5 h-5"/></span><span><b className="block text-slate-900">WhatsApp</b><span className="text-slate-600">634 029 865</span></span></a>
    <a href="mailto:coordinacion@gasisalud.com" className="flex items-center gap-4 rounded-2xl border p-5 hover:border-[#005EB8] transition-colors"><span className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Mail className="w-5 h-5"/></span><span><b className="block text-slate-900">Correo</b><span className="text-slate-600 break-all">coordinacion@gasisalud.com</span></span></a>
   </div><div className="mt-8 rounded-2xl bg-[#F3F7FB] p-5"><h3 className="font-bold text-slate-900">¿Qué información ayuda?</h3><ul className="text-slate-600 mt-3 space-y-2 text-sm"><li>• Centro o ubicación del servicio</li><li>• Número aproximado de trabajadores</li><li>• Turnos y horarios</li><li>• Actividad principal</li><li>• Qué necesidad quiere cubrir</li></ul></div></div>
   <form onSubmit={submit} className="rounded-3xl border bg-slate-50 p-7 lg:p-9 shadow-sm"><h2 className="text-2xl font-bold text-slate-900">Solicitar información</h2><p className="text-slate-600 mt-2">Le responderemos para concretar la necesidad antes de preparar una propuesta.</p><div className="grid sm:grid-cols-2 gap-4 mt-7">
    <div><Label htmlFor="name">Nombre completo *</Label><Input id="name" maxLength={80} value={formData.name} onChange={e=>set('name',e.target.value)} required/></div>
    <div><Label htmlFor="company">Empresa u organización *</Label><Input id="company" maxLength={120} value={formData.company} onChange={e=>set('company',e.target.value)} required/></div>
    <div><Label htmlFor="email">Correo electrónico *</Label><Input id="email" type="email" maxLength={254} value={formData.email} onChange={e=>set('email',e.target.value)} required/></div>
    <div><Label htmlFor="phone">Teléfono</Label><Input id="phone" type="tel" maxLength={20} value={formData.phone} onChange={e=>set('phone',e.target.value)}/></div>
    <div><Label htmlFor="employee_count">Trabajadores aproximados</Label><Input id="employee_count" maxLength={80} value={formData.employee_count} onChange={e=>set('employee_count',e.target.value)} placeholder="Ej.: 250"/></div>
    <div><Label htmlFor="service_type">Servicio de interés *</Label><select id="service_type" value={formData.service_type} onChange={e=>set('service_type',e.target.value)} required className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"><option value="">Seleccione</option><option>Enfermería presencial</option><option>Apoyo médico remoto</option><option>Fisioterapia</option><option>Psicología</option><option>Formación sanitaria</option><option>Otro</option></select></div>
   </div><div className="mt-4"><Label htmlFor="message">¿Qué necesita? *</Label><Textarea id="message" maxLength={2000} rows={6} value={formData.message} onChange={e=>set('message',e.target.value)} required placeholder="Explique brevemente el centro, turnos y necesidad que quiere cubrir."/></div>
   <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><Label htmlFor="website">Sitio web</Label><Input id="website" tabIndex={-1} autoComplete="off" value={formData.website} onChange={e=>set('website',e.target.value)}/></div>
   <label className="flex items-start gap-3 mt-5 text-sm text-slate-600"><Checkbox checked={formData.accepts_privacy} onCheckedChange={v=>set('accepts_privacy',v===true)} className="mt-0.5"/><span>Acepto la <Link to="/politica-privacidad" className="text-[#005EB8] hover:underline">política de protección de datos</Link> para que GASI responda a mi consulta. No enviaré información clínica o de salud por este formulario.</span></label>
   <Button disabled={loading} className="w-full mt-6 bg-[#005EB8] hover:bg-[#004a92] text-white py-6">{loading?'Enviando…':<>Enviar consulta <Send className="ml-2 w-4 h-4"/></>}</Button>
  </form>
  </div></section>
 </div>;
}
