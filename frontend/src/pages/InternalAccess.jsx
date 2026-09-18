import React,{useState}from'react';
import{Link,useNavigate}from'react-router-dom';
import{ArrowLeft,LockKeyhole,ShieldCheck}from'lucide-react';
import{useInternalPrototypeAuth}from'@/contexts/InternalPrototypeAuthContext';
import GasiBrand from'@/components/GasiBrand';

export default function InternalAccess(){
 const navigate=useNavigate(),{session,lastError,sessionChecking,signIn,signOut}=useInternalPrototypeAuth();
 const[workerId,setWorkerId]=useState(''),[password,setPassword]=useState('');
 const submit=async e=>{e.preventDefault();if(await signIn(workerId.trim(),password))navigate('/interno/clinica');};
 return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
  <div className="w-full max-w-md">
   <div className="flex items-center justify-between gap-4 mb-8"><GasiBrand inverse/><Link to="/" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4"/>Web pública</Link></div>
   <section className="rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
    <header className="mb-7"><div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/>Zona profesional</div><h1 className="text-3xl font-bold mt-2">Acceso individual</h1><p className="text-slate-400 mt-2">Utiliza únicamente tus credenciales. Las acciones quedan vinculadas a la identidad autenticada.</p></header>
    {session?<div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5"><p className="text-sm text-emerald-300">Sesión activa</p><h2 className="text-xl font-bold mt-1">{session.displayName}</h2><p className="text-slate-400">{session.roleLabel}</p><button onClick={()=>navigate('/interno/clinica')} className="mt-5 w-full rounded-xl bg-cyan-400 text-slate-950 font-semibold px-4 py-3">Entrar a la zona profesional</button><button onClick={signOut} className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 text-slate-300">Cerrar sesión</button></div>:
    <form onSubmit={submit}><LockKeyhole className="w-8 h-8 text-cyan-300"/><label className="block mt-5 text-sm font-medium">Identificador profesional<input autoComplete="username" required value={workerId} onChange={e=>setWorkerId(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3"/></label><label className="block mt-4 text-sm font-medium">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3"/></label>{lastError&&<p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{lastError}</p>}<button disabled={sessionChecking} className="mt-6 w-full rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold px-4 py-3">{sessionChecking?'Validando…':'Acceder'}</button></form>}
   </section>
   <p className="text-xs text-slate-500 text-center mt-5">Acceso restringido a personal autorizado de GASI.</p>
  </div>
 </main>;
}
