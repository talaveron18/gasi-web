import React,{useState}from'react';
import InternalTopbar from'@/components/InternalTopbar';
import{Link,useNavigate}from'react-router-dom';
import{BadgeCheck,Building2,Clock3,IdCard,KeyRound,LogOut,ShieldCheck,UserRound}from'lucide-react';
import{useInternalAuth}from'@/contexts/InternalAuthContext';

export default function InternalProfile(){
 const nav=useNavigate();
 const{session,token,signOut}=useInternalAuth();
 const[currentPassword,setCurrentPassword]=useState(''),[nextPassword,setNextPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!session||!token)return null;

 const changePassword=async e=>{e.preventDefault();setMessage('');if(nextPassword!==confirm){setMessage('Las contraseñas nuevas no coinciden.');return;}if(nextPassword.length<12){setMessage('La nueva contraseña debe tener al menos 12 caracteres.');return;}setBusy(true);try{
  const r=await fetch('/api/internal-clinical/password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({current_password:currentPassword,new_password:nextPassword})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail==='invalid_current_password'?'La contraseña actual no es correcta.':d.detail||'No se ha podido cambiar la contraseña.');
  setCurrentPassword('');setNextPassword('');setConfirm('');setMessage('Contraseña actualizada. Debes iniciar sesión de nuevo.');
  await signOut();nav('/interno/acceso',{replace:true});
 }catch(err){setMessage(err.message||'No se ha podido cambiar la contraseña.');}finally{setBusy(false);}};

 const logout=async()=>{await signOut();nav('/interno/acceso',{replace:true});};
 return <><InternalTopbar/><main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="internal-profile"><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
  <header className="flex flex-wrap items-start justify-between gap-4 mb-7"><div><div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><ShieldCheck className="w-4 h-4"/>GASI · Zona profesional</div><h1 className="text-3xl font-bold mt-2">Mi perfil</h1><p className="text-slate-400 mt-2">Identidad, alcance de acceso y seguridad de tu cuenta.</p></div><div className="flex gap-2"><Link to="/interno/clinica" className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Volver al canal</Link><button onClick={logout} className="rounded-xl border border-rose-400/30 px-4 py-2 text-sm text-rose-200 inline-flex items-center gap-2"><LogOut className="w-4 h-4"/>Cerrar sesión</button></div></header>

  {message&&<p role="status" className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">{message}</p>}

  <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-6">
   <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
    <div className="flex items-start gap-4"><div className="rounded-xl bg-cyan-400/10 p-3"><UserRound className="w-6 h-6 text-cyan-300"/></div><div><p className="text-sm text-slate-500">Profesional</p><p className="text-2xl font-semibold">{session.displayName}</p><p className="text-slate-400 mt-1">{session.roleLabel}</p></div></div>
    <div className="grid sm:grid-cols-2 gap-4 mt-6">
     <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500 flex items-center gap-2"><IdCard className="w-4 h-4"/>Identificador</p><p className="mt-2 font-medium break-all">{session.id}</p></div>
     <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500 flex items-center gap-2"><BadgeCheck className="w-4 h-4"/>Estado</p><p className="mt-2 font-medium">{session.status}</p></div>
     <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2"><p className="text-sm text-slate-500 flex items-center gap-2"><Building2 className="w-4 h-4"/>Centros asignados</p><div className="mt-3 flex flex-wrap gap-2">{(session.centers||[]).length?session.centers.map(center=><span key={center} className="rounded-full border border-slate-700 px-3 py-1 text-sm">{center}</span>):<span className="text-slate-400">Sin centro clínico asignado.</span>}</div></div>
     <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2"><p className="text-sm text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>Privilegios delegados</p><div className="mt-3 flex flex-wrap gap-2">{(session.delegatedPrivileges||[]).length?session.delegatedPrivileges.map(p=><span key={p} className="rounded-full border border-cyan-700/50 bg-cyan-950/20 px-3 py-1 text-sm text-cyan-200">{p}</span>):<span className="text-slate-400">Ningún privilegio adicional.</span>}</div></div>
     {session.expiresAt&&<div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2"><p className="text-sm text-slate-500 flex items-center gap-2"><Clock3 className="w-4 h-4"/>Sesión</p><p className="mt-2">Válida hasta {new Date(session.expiresAt).toLocaleString()}</p></div>}
    </div>
   </section>

   <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-400/10 p-3"><KeyRound className="w-5 h-5 text-cyan-300"/></div><div><h2 className="text-xl font-bold">Cambiar contraseña</h2><p className="text-sm text-slate-400">El cambio revoca las sesiones actuales.</p></div></div>
    <form onSubmit={changePassword} className="mt-6 space-y-4">
     <label className="block text-sm">Contraseña actual<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
     <label className="block text-sm">Nueva contraseña<input type="password" autoComplete="new-password" minLength={12} required value={nextPassword} onChange={e=>setNextPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
     <label className="block text-sm">Repetir nueva contraseña<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/></label>
     <button disabled={busy} className="w-full rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-4 py-3">{busy?'Actualizando…':'Actualizar contraseña'}</button>
    </form>
   </section>
  </div>
 </div></main></>;
}
