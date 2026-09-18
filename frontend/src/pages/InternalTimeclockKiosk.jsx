import React,{useEffect,useMemo,useState}from'react';
import{Clock3,LogIn,LogOut,ShieldCheck,UserRound,X}from'lucide-react';
import{Button}from'@/components/ui/button';

const ERROR_MAP={
 kiosk_required:'Este ordenador no está habilitado como fichador del centro.',
 mobile_timeclock_forbidden:'El fichaje desde teléfonos o dispositivos móviles está bloqueado.',
 kiosk_network_mismatch:'Este ordenador no está conectado desde la red autorizada del centro.',
 worker_not_assigned_to_center:'Tu usuario no está asignado a este centro.',
 invalid_credentials:'Usuario o contraseña incorrectos.',
 session_expired_or_revoked:'La sesión ha caducado. Vuelve a identificarte.',
 invalid_timeclock_transition:'La secuencia de fichaje no es válida.'
};

export default function InternalTimeclockKiosk(){
 const[workerId,setWorkerId]=useState(''),[password,setPassword]=useState(''),[token,setToken]=useState(''),[status,setStatus]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[clockTick,setClockTick]=useState(Date.now());

 useEffect(()=>{const id=setInterval(()=>setClockTick(Date.now()),1000);return()=>clearInterval(id);},[]);
 const shownTime=useMemo(()=>{if(!status?.server_time)return null;const base=Date.parse(status.server_time),captured=status._captured_at||Date.now();return new Date(base+(clockTick-captured));},[status,clockTick]);

 const authHeaders=t=>({Authorization:`Bearer ${t}`,'Content-Type':'application/json'});

 const loadStatus=async t=>{
  const r=await fetch('/api/internal-clinical/timeclock/kiosk/status',{headers:{Authorization:`Bearer ${t}`},credentials:'same-origin',cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(ERROR_MAP[data.detail]||'No se puede abrir el fichador de este centro.');
  setStatus({...data,_captured_at:Date.now()});
  return data;
 };

 const login=async e=>{e.preventDefault();setLoading(true);setError('');setResult(null);try{
  const r=await fetch('/api/internal-clinical/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({worker_id:workerId.trim(),password})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(ERROR_MAP[data.detail]||'No se ha podido iniciar sesión.');
  await loadStatus(data.token);
  setToken(data.token);setPassword('');
 }catch(err){setToken('');setStatus(null);setError(err.message||'No se ha podido iniciar sesión.');}finally{setLoading(false);}};

 const punch=async()=>{if(!token||!status)return;setLoading(true);setError('');setResult(null);try{
  const r=await fetch('/api/internal-clinical/timeclock/punch',{method:'POST',headers:authHeaders(token),credentials:'same-origin',body:JSON.stringify({event_type:status.expected_action})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(ERROR_MAP[data.detail]||'No se ha podido registrar el fichaje.');
  setResult(data.event);await loadStatus(token);
 }catch(err){setError(err.message||'No se ha podido registrar el fichaje.');}finally{setLoading(false);}};

 const logoutLocal=()=>{setToken('');setStatus(null);setResult(null);setError('');setWorkerId('');setPassword('');};

 if(token&&status)return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
  <section className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
   <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/>GASI · PC fijo del centro</div><h1 className="mt-3 text-3xl font-bold">Registro de jornada</h1></div><button onClick={logoutLocal} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 flex items-center gap-2"><X className="w-4 h-4"/>Cerrar sesión</button></div>
   <div className="grid sm:grid-cols-2 gap-4 mt-7">
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5"><p className="text-xs uppercase tracking-wide text-slate-500">Profesional</p><p className="font-bold text-lg mt-1 flex items-center gap-2"><UserRound className="w-5 h-5 text-cyan-300"/>{status.worker.display_name}</p><p className="text-sm text-slate-500 mt-1">{status.worker.id}</p></div>
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5"><p className="text-xs uppercase tracking-wide text-slate-500">Centro</p><p className="font-bold text-lg mt-1">{status.center}</p><p className="text-sm text-slate-500 mt-1">{status.device.label}</p></div>
   </div>
   <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-6 text-center"><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Hora del servidor GASI</p><p className="text-5xl font-bold tabular-nums mt-3">{shownTime?shownTime.toLocaleTimeString():'--:--:--'}</p><p className="text-slate-400 mt-2">{shownTime?shownTime.toLocaleDateString():''}</p></div>
   <div className="mt-6 rounded-2xl border border-slate-800 p-5"><p className="text-sm text-slate-400">Estado actual</p><p className="text-xl font-bold mt-1">{status.last_event?.event_type==='IN'?'Jornada iniciada':'Fuera de jornada'}</p>{status.last_event&&<p className="text-sm text-slate-500 mt-1">Último fichaje: {status.last_event.event_type==='IN'?'entrada':'salida'} · {new Date(status.last_event.occurred_at).toLocaleString()}</p>}</div>
   {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>}
   {result&&<div role="status" className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-4"><div className="flex items-center gap-2 text-emerald-300 font-semibold">{result.event_type==='IN'?<LogIn className="w-5 h-5"/>:<LogOut className="w-5 h-5"/>}{result.event_type==='IN'?'Entrada registrada':'Salida registrada'}</div><p className="mt-1 text-sm text-slate-300">{new Date(result.occurred_at).toLocaleString()}</p></div>}
   <Button onClick={punch} disabled={loading} className={`w-full mt-6 font-bold py-7 text-lg ${status.expected_action==='IN'?'bg-emerald-400 hover:bg-emerald-300':'bg-amber-300 hover:bg-amber-200'} text-slate-950`}>{loading?'Registrando…':status.expected_action==='IN'?<><LogIn className="mr-2 w-5 h-5"/>Registrar entrada</>:<><LogOut className="mr-2 w-5 h-5"/>Registrar salida</>}</Button>
   <p className="mt-4 text-center text-xs text-slate-500">El fichaje solo se acepta desde este PC autorizado y desde la red registrada del centro.</p>
  </section>
 </main>;

 return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
  <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
   <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/>GASI · PC fijo del centro</div>
   <h1 className="mt-3 text-3xl font-bold">Inicio de turno</h1>
   <p className="mt-2 text-slate-400">Identifícate en el ordenador fijo del centro. Después verás la hora oficial y podrás registrar entrada o salida.</p>
   <form onSubmit={login} className="mt-8 space-y-4">
    <label className="block text-sm">Identificador profesional<input autoComplete="username" required value={workerId} onChange={e=>setWorkerId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
    <label className="block text-sm">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
    {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>}
    <Button disabled={loading} className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold py-6">{loading?'Comprobando…':<><Clock3 className="mr-2 w-5 h-5"/>Entrar al fichador</>}</Button>
   </form>
  </section>
 </main>;
}
