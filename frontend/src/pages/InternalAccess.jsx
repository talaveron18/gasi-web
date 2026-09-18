import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{LockKeyhole,ShieldCheck}from'lucide-react';
import{useInternalPrototypeAuth}from'@/contexts/InternalPrototypeAuthContext';
export default function InternalAccess(){
 const navigate=useNavigate(),{session,lastError,sessionChecking,signIn,signOut}=useInternalPrototypeAuth();
 const[workerId,setWorkerId]=useState(''),[password,setPassword]=useState('');
 const submit=async e=>{e.preventDefault();if(await signIn(workerId.trim(),password))navigate('/interno/clinica');};
 return <main className="min-h-screen bg-slate-950 text-slate-100 py-12"><div className="max-w-md mx-auto px-4">
  <header className="mb-8"><div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/>GASI · Zona interna</div><h1 className="text-3xl font-bold mt-2">Acceso profesional</h1><p className="text-slate-400 mt-2">Acceso individual. Las acciones quedan vinculadas a la identidad autenticada.</p></header>
  {session?<section className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-6"><p className="text-sm text-emerald-300">Sesión activa</p><h2 className="text-xl font-bold mt-1">{session.displayName}</h2><p className="text-slate-400">{session.roleLabel}</p><button onClick={()=>navigate('/interno/clinica')} className="mt-5 w-full rounded-lg bg-cyan-400 text-slate-950 font-semibold px-4 py-2">Entrar</button><button onClick={signOut} className="mt-3 w-full rounded-lg border border-slate-700 px-4 py-2">Cerrar sesión</button></section>:
  <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><LockKeyhole className="w-7 h-7 text-cyan-300"/><label className="block mt-5 text-sm">Identificador profesional<input autoComplete="username" required value={workerId} onChange={e=>setWorkerId(e.target.value)} className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"/></label><label className="block mt-4 text-sm">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"/></label>{lastError&&<p role="alert" className="mt-4 text-sm text-rose-300">{lastError}</p>}<button disabled={sessionChecking} className="mt-5 w-full rounded-lg bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold px-4 py-2">{sessionChecking?'Validando…':'Acceder'}</button></form>}
 </div></main>;
}