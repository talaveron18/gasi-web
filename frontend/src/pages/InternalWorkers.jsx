import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BadgeCheck, Ban, ClipboardList, Plus, ShieldCheck, UserCog } from 'lucide-react';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';

const ROLE_OPTIONS = [['nurse', 'Enfermería'], ['physician', 'Facultativo'], ['admin', 'Administración / Coordinación']];

export default function InternalWorkers() {
  const navigate = useNavigate();
  const { session, identities, accessAudit, centralValidationEnabled, addSyntheticIdentity, setIdentityStatus } = useInternalPrototypeAuth();
  const [form, setForm] = useState({ displayName: '', role: 'nurse', center: 'Centro ficticio Madrid 01' });
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const sortedAudit = useMemo(() => [...accessAudit].reverse().slice(0, 30), [accessAudit]);

  if (!session || session.role !== 'admin') {
    return <main className="min-h-screen bg-slate-950 text-slate-100 py-10"><div className="max-w-3xl mx-auto px-4"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6"><h1 className="text-2xl font-bold">Acceso restringido</h1><p className="text-slate-300 mt-2">La gestión de identidades del prototipo está reservada a Administración / Coordinación.</p><button type="button" onClick={() => navigate('/interno/prototipo-clinico')} className="mt-4 rounded-lg border border-slate-600 px-4 py-2">Volver al panel</button></div></div></main>;
  }

  const createIdentity = (event) => {
    event.preventDefault();
    const result = addSyntheticIdentity({ displayName: form.displayName, role: form.role, centers: [form.center] });
    setMessage(result.ok ? 'Identidad sintética creada. Sigue pendiente de validación real antes de cualquier uso operativo.' : result.error);
    if (result.ok) setForm({ displayName: '', role: 'nurse', center: 'Centro ficticio Madrid 01' });
  };

  const changeStatus = async (identityId, status) => {
    setUpdatingId(identityId);
    const result = await setIdentityStatus(identityId, status);
    setMessage(result.ok ? `Estado actualizado a ${status}${centralValidationEnabled ? ' y confirmado por el backend sintético.' : '.'}` : result.error);
    setUpdatingId(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="internal-workers-prototype">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 mb-6 flex gap-3 items-start"><AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" /><div><p className="font-semibold text-amber-200">GESTIÓN SINTÉTICA DE TRABAJADORES</p><p className="text-sm text-amber-100/80">No sustituye alta profesional, colegiación, habilitación, documentación laboral ni autenticación de producción. No contiene datos reales.</p></div></div>
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8"><div><div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold"><UserCog className="w-4 h-4" /> GASI · Zona interna</div><h1 className="text-3xl md:text-4xl font-bold mt-2">Trabajadores y accesos</h1><p className="text-slate-400 mt-2">Alta lógica, rol, centro/contexto, revocación y auditoría de acceso del prototipo.</p><p className="text-xs text-slate-500 mt-2">Autoridad sintética: {centralValidationEnabled ? 'BACKEND ACTIVO · cambios de acceso confirmados antes de reflejarse localmente' : 'LOCAL · maqueta en memoria'}.</p></div><button type="button" onClick={() => navigate('/interno/prototipo-clinico')} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2"><ArrowLeft className="w-4 h-4" />Panel clínico</button></header>
        {message && <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">{message}</div>}
        <section className="grid lg:grid-cols-3 gap-6 mb-8">
          <form onSubmit={createIdentity} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-cyan-300" />Alta sintética</h2>
            {centralValidationEnabled && <p className="mt-3 text-sm text-amber-200">Alta local deshabilitada con autoridad central activa hasta implementar un endpoint autoritativo de alta sintética.</p>}
            <label className="block mt-4 text-sm text-slate-400">Nombre ficticio<input disabled={centralValidationEnabled} required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50" placeholder="Profesional Demo 02" /></label>
            <label className="block mt-3 text-sm text-slate-400">Rol<select disabled={centralValidationEnabled} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50">{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block mt-3 text-sm text-slate-400">Centro/contexto ficticio<input disabled={centralValidationEnabled} required value={form.center} onChange={(e) => setForm({ ...form, center: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 disabled:opacity-50" /></label>
            <button disabled={centralValidationEnabled} type="submit" className="mt-5 w-full rounded-lg bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold px-4 py-2">Crear identidad demo</button>
          </form>
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Directorio sintético</h2>
            <table className="w-full text-sm min-w-[760px]"><thead className="text-slate-500 text-left"><tr><th className="pb-3">Identidad</th><th className="pb-3">Rol</th><th className="pb-3">Centro/contexto</th><th className="pb-3">Acceso</th><th className="pb-3">Estado operativo</th><th className="pb-3">Acción</th></tr></thead><tbody className="divide-y divide-slate-800">{identities.map((identity) => <tr key={identity.id}><td className="py-3"><p className="font-semibold">{identity.displayName}</p><p className="font-mono text-xs text-slate-500">{identity.id}</p></td><td className="py-3">{identity.roleLabel}</td><td className="py-3 text-slate-400">{identity.centers.join(', ')}</td><td className="py-3">{identity.status === 'ACTIVE' ? <span className="inline-flex gap-1 items-center text-emerald-300"><BadgeCheck className="w-4 h-4" />ACTIVO</span> : <span className="inline-flex gap-1 items-center text-rose-300"><Ban className="w-4 h-4" />REVOCADO</span>}</td><td className="py-3 text-slate-400">{identity.operationalStatus}</td><td className="py-3">{identity.status === 'ACTIVE' ? <button type="button" disabled={identity.id === session.id || updatingId === identity.id} onClick={() => changeStatus(identity.id, 'REVOKED')} className="rounded border border-rose-400/30 px-2 py-1 text-rose-200 disabled:opacity-30">Revocar</button> : <button type="button" disabled={updatingId === identity.id} onClick={() => changeStatus(identity.id, 'ACTIVE')} className="rounded border border-emerald-400/30 px-2 py-1 text-emerald-200 disabled:opacity-30">Reactivar</button>}</td></tr>)}</tbody></table>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-cyan-300" />Auditoría append-only del prototipo</h2><p className="text-sm text-slate-500 mt-2">Registra eventos de acceso y ciclo de vida de identidades. No registra secretos ni contenido clínico.</p><div className="mt-4 space-y-2">{sortedAudit.map((entry) => <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><div className="flex flex-col md:flex-row md:items-center justify-between gap-1"><span className="font-mono text-cyan-200">{entry.action}</span><span className="text-slate-600">{entry.at}</span></div><p className="text-slate-300 mt-1">{entry.actor} → {entry.targetId || '—'}</p><p className="text-slate-500">{entry.detail}</p></div>)}</div></section>
        <section className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5"><p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-300" />Gate de producción</p><p className="text-sm text-slate-400 mt-2">La versión real deberá integrar proveedor de identidad, autenticación reforzada, expiración y revocación central de sesiones, backend autorizado, permisos de mínimo privilegio y auditoría persistente en el Frente B cuando el evento pertenezca al entorno clínico.</p></section>
      </div>
    </main>
  );
}
