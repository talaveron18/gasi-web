import React,{useState}from'react';
import{Clock3,LogIn,LogOut,ShieldCheck}from'lucide-react';
import{Button}from'@/components/ui/button';

export default function InternalTimeclockKiosk(){
 const[workerId,setWorkerId]=useState(''),[password,setPassword]=useState(''),[loading,setLoading]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('');
 const submit=async e=>{e.preventDefault();setLoading(true);setError('');setResult(null);try{
  const r=await fetch('/api/internal-clinical/timeclock/punch',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({worker_id:workerId.trim(),password})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const map={kiosk_required:'Este equipo no está habilitado como terminal de fichaje.',invalid_credentials_or_center:'Credenciales incorrectas o trabajador no asignado a este centro.',invalid_timeclock_transition:'La secuencia de fichaje no es válida.'};throw new Error(map[data.detail]||'No se ha podido registrar el fichaje.');}
  setResult(data.event);setPassword('');
 }catch(err){setError(err.message||'No se ha podido registrar el fichaje.');}finally{setLoading(false);}};
 return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
  <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
   <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/>GASI · Terminal del centro</div>
   <h1 className="mt-3 text-3xl font-bold">Registro de jornada</h1>
   <p className="mt-2 text-slate-400">Este fichaje solo funciona en un terminal previamente habilitado para este centro. La hora la fija el servidor.</p>
   <form onSubmit={submit} className="mt-8 space-y-4">
    <label className="block text-sm">Identificador profesional<input autoComplete="username" required value={workerId} onChange={e=>setWorkerId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
    <label className="block text-sm">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
    {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>}
    {result&&<div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-4">
      <div className="flex items-center gap-2 text-emerald-300 font-semibold">{result.event_type==='IN'?<LogIn className="w-5 h-5"/>:<LogOut className="w-5 h-5"/>}{result.event_type==='IN'?'Entrada registrada':'Salida registrada'}</div>
      <p className="mt-1 text-sm text-slate-300">{new Date(result.occurred_at).toLocaleString()}</p>
      <p className="text-xs text-slate-500 mt-1">{result.center}</p>
    </div>}
    <Button disabled={loading} className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold py-6">{loading?'Registrando…':<><Clock3 className="mr-2 w-5 h-5"/>Fichar ahora</>}</Button>
   </form>
  </section>
 </main>;
}
