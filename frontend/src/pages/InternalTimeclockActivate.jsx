import React,{useState}from'react';
import{ShieldCheck}from'lucide-react';
import{Button}from'@/components/ui/button';

export default function InternalTimeclockActivate(){
 const[deviceId,setDeviceId]=useState(''),[token,setToken]=useState(''),[loading,setLoading]=useState(false),[done,setDone]=useState(null),[error,setError]=useState('');
 const submit=async e=>{e.preventDefault();setLoading(true);setError('');try{
  const r=await fetch('/api/internal-clinical/timeclock/kiosk/activate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({device_id:deviceId.trim(),activation_token:token.trim()})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const map={invalid_kiosk_activation:'Código de activación no válido.',mobile_timeclock_forbidden:'No se puede activar un teléfono o dispositivo móvil como terminal de fichaje.'};throw new Error(map[data.detail]||'No se ha podido activar este terminal.');}
  setDone(data.device);setToken('');
 }catch(err){setError(err.message||'No se ha podido activar este terminal.');}finally{setLoading(false);}};
 if(done)return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4"><div className="max-w-lg rounded-3xl border border-emerald-500/30 bg-slate-900 p-8 text-center"><ShieldCheck className="w-12 h-12 text-emerald-300 mx-auto"/><h1 className="text-2xl font-bold mt-4">Terminal habilitado</h1><p className="text-slate-400 mt-2">{done.label} · {done.center}</p><a href="/interno/fichaje" className="inline-block mt-6 rounded-xl bg-cyan-400 text-slate-950 font-semibold px-5 py-3">Abrir fichador</a></div></main>;
 return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8"><div className="text-cyan-300 font-semibold text-sm">GASI · Activación restringida</div><h1 className="text-3xl font-bold mt-2">Habilitar terminal</h1><p className="text-slate-400 mt-2">Use el identificador y código de activación entregados por coordinación. El código queda inutilizado después de esta activación.</p><label className="block mt-6 text-sm">Identificador del terminal<input required value={deviceId} onChange={e=>setDeviceId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label><label className="block mt-4 text-sm">Código de activación<input required type="password" value={token} onChange={e=>setToken(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>{error&&<p role="alert" className="mt-4 text-rose-300">{error}</p>}<Button disabled={loading} className="w-full mt-6 bg-cyan-400 text-slate-950 font-semibold">{loading?'Activando…':'Activar este equipo'}</Button></form></main>;
}
