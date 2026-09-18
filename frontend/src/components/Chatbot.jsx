import React,{useEffect,useRef,useState}from'react';
import{MessageCircle,Send,X}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Link}from'react-router-dom';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE=/^[+()\d\s.-]{7,20}$/;
const SERVICES=[
 'Enfermería presencial',
 'Apoyo médico remoto',
 'Fisioterapia',
 'Psicología',
 'Formación sanitaria',
 'Otro'
];
const INFO={
 'Enfermería presencial':'Podemos configurar presencia enfermera en el centro para atención sanitaria dentro del alcance acordado, con circuitos de escalado y apoyo médico remoto cuando corresponda.',
 'Apoyo médico remoto':'El apoyo médico remoto se plantea asociado a una cobertura sanitaria concreta y con funciones delimitadas. No sustituye a los servicios de emergencia.',
 'Fisioterapia':'Podemos incorporar fisioterapia cuando el perfil de actividad del centro y la configuración contratada lo justifiquen.',
 'Psicología':'Podemos incorporar atención psicológica puntual dentro del servicio acordado. El seguimiento terapéutico continuado queda fuera de la cobertura corporativa ordinaria.',
 'Formación sanitaria':'Diseñamos formación sanitaria para empresas: primeros auxilios, reanimación cardiopulmonar, respuesta ante urgencias y contenidos adaptados al entorno de trabajo.',
 'Otro':'Cuéntanos qué necesitas y revisaremos qué configuración sanitaria puede encajar.'
};

export default function Chatbot(){
 const[isOpen,setIsOpen]=useState(false),[messages,setMessages]=useState([]),[input,setInput]=useState(''),[loading,setLoading]=useState(false),[step,setStep]=useState('inicio'),[acceptsPrivacy,setAcceptsPrivacy]=useState(false);
 const[userData,setUserData]=useState({service:'',name:'',company:'',email:'',phone:'',website:''});
 const endRef=useRef(null),inputRef=useRef(null);

 useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
 useEffect(()=>{if(isOpen&&messages.length===0){setMessages([{role:'assistant',content:'Hola. Puedo orientarte sobre los servicios de GASI o dejar tu consulta preparada para coordinación.',showServices:true}]);}if(isOpen&&inputRef.current)inputRef.current.focus();},[isOpen,messages.length]);

 const addBot=(content,extra={})=>setMessages(prev=>[...prev,{role:'assistant',content,...extra}]);
 const addUser=content=>setMessages(prev=>[...prev,{role:'user',content}]);

 const reset=()=>{setIsOpen(false);setMessages([]);setInput('');setLoading(false);setStep('inicio');setAcceptsPrivacy(false);setUserData({service:'',name:'',company:'',email:'',phone:'',website:''});};

 const chooseService=service=>{
  addUser(service);setUserData(prev=>({...prev,service}));
  addBot(INFO[service]||INFO.Otro);
  addBot('¿Quieres que coordinación se ponga en contacto contigo?',{showContactChoice:true});
  setStep('confirmar');
 };

 const chooseContact=yes=>{
  addUser(yes?'Sí, quiero que me contacten':'No, solo quería información');
  if(!yes){addBot('Perfecto. Si más adelante quieres hablar con nosotros, puedes usar el formulario de contacto, llamar al 622 822 101 o escribir a coordinacion@gasisalud.com.');setStep('fin');return;}
  addBot('De acuerdo. Antes de recoger datos, marca la casilla de privacidad. Después empezamos por tu nombre.');
  setStep('nombre');
 };

 const handleInput=async()=>{
  const text=input.trim();if(!text||loading)return;
  if(step==='nombre'&&!acceptsPrivacy){addBot('Para dejar tus datos necesitamos que aceptes antes la política de protección de datos.');return;}
  if(step==='nombre'&&(text.length<2||text.length>80)){addBot('Indica un nombre válido.');return;}
  if(step==='empresa'&&(text.length<2||text.length>120)){addBot('Indica el nombre de la empresa.');return;}
  if(step==='email'&&!EMAIL_RE.test(text)){addBot('Ese correo no parece válido. Revísalo e inténtalo de nuevo.');return;}
  if(step==='telefono'&&text&&text!=='-'&&!PHONE_RE.test(text)){addBot('Ese teléfono no parece válido. Puedes corregirlo o escribir - si prefieres no indicarlo.');return;}
  setInput('');addUser(text);
  if(step==='nombre'){setUserData(p=>({...p,name:text}));setStep('empresa');addBot('¿De qué empresa u organización nos escribes?');return;}
  if(step==='empresa'){setUserData(p=>({...p,company:text}));setStep('email');addBot('¿Cuál es tu correo electrónico?');return;}
  if(step==='email'){setUserData(p=>({...p,email:text}));setStep('telefono');addBot('Si quieres, deja un teléfono. Si prefieres no indicarlo, escribe -.');return;}
  if(step==='telefono'){
   const phone=text==='-'?'':text;
   const payload={name:userData.name,company:userData.company,email:userData.email,phone,employee_count:'',service_type:userData.service||'Otro',message:'Solicitud de contacto enviada desde el asistente web de GASI.',website:userData.website,accepts_privacy:true};
   setLoading(true);setStep('enviando');
   try{
    const r=await fetch('/.netlify/functions/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const map={missing_fields:'Faltan datos para enviar la consulta.',privacy_required:'Debes aceptar la política de protección de datos.',invalid_email:'Revisa el correo electrónico.',invalid_phone:'Revisa el teléfono.',invalid_service:'Selecciona un servicio válido.',payload_too_large:'La consulta es demasiado larga.',service_unavailable:'El servicio de envío no está disponible temporalmente.',delivery_failed:'No se ha podido entregar la consulta.'};throw new Error(map[data.message]||'No se ha podido enviar la consulta.');}
    addBot('Perfecto. La consulta ha quedado enviada a coordinación. Este asistente no es un canal clínico ni de urgencias.');setStep('fin');
   }catch(err){addBot((err&&err.message)||'No se ha podido enviar. Puedes escribir a coordinacion@gasisalud.com o llamar al 622 822 101.');setStep('fin');}
   finally{setLoading(false);}
  }
 };

 const showInput=['nombre','empresa','email','telefono'].includes(step);
 return <>
  {!isOpen&&<button onClick={()=>setIsOpen(true)} aria-label="Abrir asistente GASI" className="fixed bottom-6 right-6 z-50 bg-[#005EB8] hover:bg-[#004a92] text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"><MessageCircle className="w-6 h-6"/></button>}
  {isOpen&&<div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-2rem))] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
   <div className="bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5"/></div><div><h3 className="font-semibold">Asistente GASI</h3><p className="text-xs opacity-90">Información y contacto comercial</p></div></div><button onClick={reset} aria-label="Cerrar asistente" className="hover:bg-white/20 rounded-full p-1"><X className="w-5 h-5"/></button></div>
   <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" aria-live="polite">
    {messages.map((m,i)=><div key={i}><div className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${m.role==='user'?'bg-[#005EB8] text-white':'bg-white text-gray-900 shadow-sm'}`}><p className="text-sm leading-relaxed">{m.content}</p></div></div>
      {m.showServices&&step==='inicio'&&<div className="grid gap-2 mt-3">{SERVICES.map(s=><button key={s} onClick={()=>chooseService(s)} className="w-full bg-white hover:bg-[#005EB8] hover:text-white text-[#005EB8] border border-[#005EB8] font-semibold py-2.5 px-4 rounded-xl transition-all text-sm">{s}</button>)}</div>}
      {m.showContactChoice&&step==='confirmar'&&<div className="grid grid-cols-2 gap-2 mt-3"><button onClick={()=>chooseContact(true)} className="rounded-xl bg-[#005EB8] text-white py-2.5 font-semibold">Sí</button><button onClick={()=>chooseContact(false)} className="rounded-xl border border-gray-300 bg-white py-2.5 font-semibold text-gray-700">No</button></div>}
    </div>)}
    {loading&&<div className="text-sm text-gray-500">Enviando…</div>}<div ref={endRef}/>
   </div>
   {['nombre','empresa','email','telefono'].includes(step)&&<div className="px-4 py-3 border-t bg-white text-xs text-gray-600"><label className="flex items-start gap-2"><input type="checkbox" checked={acceptsPrivacy} onChange={e=>setAcceptsPrivacy(e.target.checked)} className="mt-0.5"/><span>Acepto la <Link to="/politica-privacidad" className="text-[#005EB8] hover:underline" onClick={()=>setIsOpen(false)}>política de protección de datos</Link> para que GASI responda a mi consulta. No enviaré información clínica o de salud por este canal.</span></label></div>}
   {showInput&&<div className="p-4 border-t bg-white"><div className="flex gap-2"><input ref={inputRef} type={step==='email'?'email':step==='telefono'?'tel':'text'} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleInput();}}} placeholder={step==='empresa'?'Empresa u organización':'Escribe tu respuesta…'} maxLength={step==='email'?254:step==='telefono'?20:120} className="flex-1 min-w-0 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#005EB8]" disabled={loading}/><Button onClick={handleInput} disabled={!input.trim()||loading} className="rounded-xl bg-[#005EB8] hover:bg-[#004a92] text-white px-5" aria-label="Enviar respuesta"><Send className="w-5 h-5"/></Button></div></div>}
  </div>}
 </>;
}
