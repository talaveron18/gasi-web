import React,{useState} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {GraduationCap,LockKeyhole} from 'lucide-react';
import {AULA_ENABLED,useAula} from './AulaAuthContext';

export default function AulaLogin(){
  const{user,loading,login,changePassword}=useAula();
  const[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const[nextPassword,setNextPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  if(!AULA_ENABLED)return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-2xl font-bold">Aula privada no habilitada</h1><p className="mt-3">GASI habilitará el acceso cuando estén verificados el backend y las cuentas.</p><Link to="/acceso" className="mt-4 inline-block text-blue-700 underline">Volver</Link></main>;
  if(loading)return <p role="status" className="p-10">Comprobando sesión del aula…</p>;
  if(user&&!user.must_change_password)return <Navigate to={user.role==='admin'||user.role==='author'?'/aula/autor':'/aula/mis-cursos'} replace/>;
  const submit=async event=>{
    event.preventDefault();setBusy(true);setError('');
    const result=user?await changePassword(password,nextPassword):await login(email,password);
    setBusy(false);if(!result.ok)setError(result.error);
    else if(user){setPassword('');setNextPassword('');setError('Contraseña cambiada. Inicia sesión de nuevo.');}
  };
  return <main className="min-h-[70vh] bg-slate-50 px-5 py-16 text-slate-900" data-testid="aula-login">
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <GraduationCap className="h-9 w-9 text-[#005EB8]" aria-hidden="true"/>
      <h1 className="mt-4 text-3xl font-bold">{user?'Cambiar contraseña inicial':'Acceso al Aula Virtual GASI'}</h1>
      <p className="mt-2 text-sm text-slate-600">{user?'Por seguridad debes establecer una contraseña propia antes de acceder.':'Solo para alumnado, tutores y autores dados de alta por GASI. No existe registro público.'}</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        {!user&&<label className="block text-sm font-semibold">Correo de acceso<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3"/></label>}
        <label className="block text-sm font-semibold">{user?'Contraseña provisional':'Contraseña'}<input autoComplete={user?'current-password':'current-password'} type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3"/></label>
        {user&&<label className="block text-sm font-semibold">Nueva contraseña (mínimo 12 caracteres)<input autoComplete="new-password" type="password" required minLength={12} value={nextPassword} onChange={e=>setNextPassword(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3"/></label>}
        {error&&<p role="alert" className="text-sm text-rose-800">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white disabled:opacity-50"><LockKeyhole size={17} aria-hidden="true"/>{busy?'Comprobando…':user?'Establecer nueva contraseña':'Entrar al aula'}</button>
      </form>
      <p className="mt-6 text-xs leading-relaxed text-slate-500">GASI registra los accesos y el tiempo de conexión para el seguimiento académico. Consulta la <Link className="text-[#005EB8] underline" to="/politica-privacidad">información de privacidad</Link>. No compartas tus credenciales.</p>
    </div>
  </main>;
}
