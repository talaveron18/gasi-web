import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Ban, KeyRound, Plus, ShieldCheck, UserCog } from 'lucide-react';
import { useInternalAuth } from '@/contexts/InternalAuthContext';

const ROLE_OPTIONS = [['nurse','Enfermería'],['physician','Facultativo'],['psychologist','Psicología'],['physiotherapist','Fisioterapia'],['admin','Administración / Coordinación']];
const PRIVS = [['worker_access_management','Jefe de servicio / gestión de trabajadores'],['clinical_record_privileged_read','Lectura clínica privilegiada']];

export default function InternalWorkers() {
  const nav = useNavigate();
  const { session, identities, addIdentity, setIdentityStatus, grantPrivilege, isMaster } = useInternalAuth();
  const [form,setForm] = useState({displayName:'',role:'nurse',center:'',temporaryPassword:''});
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState('');
  
  const canManage = Boolean(session && (isMaster || session.delegatedPrivileges?.includes('worker_access_management')));

  if (!canManage) return <main className="min-h-screen bg-slate-950 text-slate-100 p-10"><h1>Acceso restringido</h1><p className="mt-2 text-slate-400">La gestión de trabajadores exige delegación expresa de la cuenta maestra.</p></main>;

  const create = async (e) => {
    e.preventDefault(); setBusy('create');
    const r = await addIdentity({displayName:form.displayName,role:form.role,centers:form.role==='admin'?[]:[form.center],temporaryPassword:form.temporaryPassword});
    setMessage(r.ok?'Identidad creada y confirmada.':r.error);
    if(r.ok)setForm({displayName:'',role:'nurse',center:'',temporaryPassword:''});
    setBusy('');
  };
  const status = async (id,s) => { setBusy(id); const r=await setIdentityStatus(id,s); setMessage(r.ok?'Estado actualizado.':r.error); setBusy(''); };
  const privilege = async (id,p,on) => { setBusy(`${id}-${p}`); const r=await grantPrivilege(id,p,on); setMessage(r.ok?`${on?'Privilegio concedido':'Privilegio retirado'} y auditado.`:r.error); setBusy(''); };

  return <main className="min-h-screen bg-slate-950 text-slate-100 py-10"><div className="max-w-7xl mx-auto px-4">
    <header className="flex justify-between mb-8"><div><p className="text-cyan-300">GASI · Zona interna</p><h1 className="text-3xl font-bold">Trabajadores, roles y privilegios</h1><p className="text-slate-400">Una identidad conserva su rol profesional y puede acumular privilegios delegados.</p></div><button aria-label="Volver" onClick={()=>nav('/interno/clinica')}><ArrowLeft/></button></header>
    {message&&<div role="status" aria-live="polite" className="mb-5 p-3 bg-slate-900 rounded">{message}</div>}
    <section className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={create} className="bg-slate-900 rounded-xl p-5"><h2 className="font-bold flex gap-2"><Plus/>Alta</h2><label className="block mt-4 text-sm">Nombre<input required placeholder="Nombre del profesional" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} className="w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded"/></label><label className="block mt-3 text-sm">Rol base<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded">{ROLE_OPTIONS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>{form.role!=='admin'&&<label className="block mt-3 text-sm">Centro<input required value={form.center} onChange={e=>setForm({...form,center:e.target.value})} className="w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded"/></label>}<label className="block mt-3 text-sm">Contraseña inicial<input type="password" minLength={12} required value={form.temporaryPassword} onChange={e=>setForm({...form,temporaryPassword:e.target.value})} className="w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded"/></label><button disabled={busy==='create'} className="w-full mt-4 bg-cyan-400 text-slate-950 p-2 rounded font-bold">Crear identidad</button></form>
      <div className="lg:col-span-2 bg-slate-900 rounded-xl p-5 overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead><tr className="text-left text-slate-500"><th>Identidad</th><th>Rol base</th><th>Centro</th><th>Privilegios adicionales</th><th>Acceso</th></tr></thead><tbody>{identities.map(i=><tr key={i.id} className="border-t border-slate-800"><td className="py-4"><b>{i.displayName}</b><div className="font-mono text-xs text-slate-500">{i.id}</div></td><td>{i.roleLabel}</td><td>{i.centers?.join(', ')||'—'}</td><td className="py-3">{i.id===session.id&&isMaster?<span className="text-cyan-300 inline-flex gap-1"><ShieldCheck className="w-4"/>Cuenta maestra</span>:<div className="space-y-2">{PRIVS.map(([p,label])=>{const on=i.delegatedPrivileges?.includes(p);return <label key={p} className={`flex gap-2 items-start ${!isMaster?'opacity-60':''}`}><input type="checkbox" checked={Boolean(on)} disabled={!isMaster||busy===`${i.id}-${p}`} onChange={e=>privilege(i.id,p,e.target.checked)}/><span><span className="flex gap-1 items-center"><KeyRound className="w-3"/>{label}</span>{p==='clinical_record_privileged_read'&&<small className="text-slate-500 block">Solo lectura; cada acceso exige motivo y referencia.</small>}</span></label>})}</div>}</td><td>{i.id===session.id?<span className="text-slate-500">Sesión actual</span>:i.status==='ACTIVE'?<button disabled={busy===i.id} onClick={()=>status(i.id,'REVOKED')} className="text-rose-300 inline-flex gap-1"><BadgeCheck className="w-4"/>Revocar</button>:<button disabled={busy===i.id} onClick={()=>status(i.id,'ACTIVE')} className="text-emerald-300 inline-flex gap-1"><Ban className="w-4"/>Reactivar</button>}</td></tr>)}</tbody></table></div>
    </section>
    
    {!isMaster&&<section className="mt-6 border border-slate-700 p-5 rounded-xl"><p className="text-sm text-slate-400">La delegación de gestión permite altas y cambios de acceso, pero no concede privilegios ni acceso a la auditoría completa.</p></section>}
    <section className="mt-6 border border-cyan-500/20 p-5 rounded-xl"><p className="flex gap-2"><UserCog/>Los privilegios se añaden al rol profesional: no sustituyen Enfermería, Facultativo, Psicología o Fisioterapia.</p></section>
  </div></main>;
}