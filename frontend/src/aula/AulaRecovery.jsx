import React,{useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {AULA_ENABLED,useAula} from './AulaAuthContext';

export default function AulaRecovery(){
  const [params]=useSearchParams(),token=params.get('token');
  const {request}=useAula();
  const[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  const submit=async(event)=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      if(token){
        await request('/auth/reset-confirm',{method:'POST',body:{token,new_password:password}});
      }else{
        await request('/auth/reset-request',{method:'POST',body:{email}});
      }
      setDone(true);
    }catch(e){setError(e.status===410?'El enlace ha caducado o ya se ha utilizado. Solicita otro.':e.status===429?'Has realizado demasiadas solicitudes. Inténtalo más tarde.':'No se ha podido gestionar la recuperación. '+e.message);}
    finally{setBusy(false);}
  };
  return <main className="min-h-[70vh] bg-slate-50 px-5 py-14 text-slate-900">
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7">
      <h1 className="text-2xl font-bold">Recuperar acceso al aula</h1>
      {!AULA_ENABLED?<p className="mt-4 text-slate-600">La recuperación de contraseñas se habilitará cuando GASI configure el correo del aula privada.</p>:
      done?<div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        {token?'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.':'Si existe una cuenta activa, recibirás un mensaje con las instrucciones para restablecer tu contraseña. Comprueba también el correo no deseado.'}
      </div>:
      <form onSubmit={submit} className="mt-5 space-y-4">
        {token?<label className="block text-sm font-semibold">Nueva contraseña (mínimo 12 caracteres)
          <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3"/></label>:
          <label className="block text-sm font-semibold">Correo de la cuenta
            <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3"/></label>}
        {error&&<p role="alert" className="text-sm text-rose-800">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'Procesando…':token?'Establecer nueva contraseña':'Enviar instrucciones'}</button>
      </form>}
      <Link className="mt-5 inline-block text-sm font-semibold text-[#005EB8] underline" to="/aula/acceso">Volver al acceso</Link>
      <p className="mt-5 text-xs text-slate-500">No hay registro público ni atención clínica en el aula. Nunca compartas tu contraseña con GASI por correo.</p>
    </div>
  </main>;
}
