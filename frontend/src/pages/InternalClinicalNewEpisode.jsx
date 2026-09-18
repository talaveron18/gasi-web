import React, { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
import { createInternalClinicalApi } from '@/lib/internalClinicalApi';
import { createAuthoritativeClinicalEpisode } from '@/lib/internalClinicalActions';

const EMPTY_FORM = { patientRef: '', center: '', level: 2, summary: '' };
const CREATOR_ROLES = ['nurse', 'psychologist', 'physiotherapist'];
const ROLE_COPY = {
  nurse: { title: 'Abrir caso clínico', label: 'Enfermería', level: true },
  psychologist: { title: 'Abrir consulta de Psicología', label: 'Psicología', level: false },
  physiotherapist: { title: 'Abrir consulta de Fisioterapia', label: 'Fisioterapia', level: false },
};

export default function InternalClinicalNewEpisode() {
  const { session, token } = useInternalPrototypeAuth();
  const api = useMemo(() => token ? createInternalClinicalApi({ token }) : null, [token]);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, center: Array.isArray(session?.centers) ? session.centers[0] || '' : '' }));
  const [state, setState] = useState('IDLE');
  const [errorCode, setErrorCode] = useState(null);
  const [createdEpisode, setCreatedEpisode] = useState(null);

  if (!session) return null;
  if (!CREATOR_ROLES.includes(session.role)) return <Navigate to="/interno/prototipo-clinico" replace />;

  const centers = Array.isArray(session.centers) ? session.centers : [];
  const roleCopy = ROLE_COPY[session.role];
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setState('IDLE'); setErrorCode(null); };

  const submit = async (event) => {
    event.preventDefault(); setState('SAVING'); setErrorCode(null); setCreatedEpisode(null);
    const result = await createAuthoritativeClinicalEpisode({ api, session, patientRef: form.patientRef, center: form.center, level: roleCopy.level ? form.level : 2, summary: form.summary });
    if (!result.ok) { setState('ERROR'); setErrorCode(result.errorCode); return; }
    setCreatedEpisode(result.episode); setState('SAVED'); setForm((current) => ({ ...EMPTY_FORM, center: current.center }));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="authoritative-new-episode">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-cyan-300">GASI · Zona clínica interna</p><h1 className="mt-1 text-3xl font-bold">{roleCopy.title}</h1><p className="mt-2 text-sm text-slate-400">{roleCopy.label} · identidad individual y acceso limitado a centros asignados.</p></div><Link to="/interno/prototipo-clinico" className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Volver a casos</Link></div>
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="block"><span className="text-sm font-semibold">Referencia de paciente</span><input value={form.patientRef} onChange={(event) => update('patientRef', event.target.value)} required maxLength={120} placeholder="Referencia interna" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /></label>
          <label className="block"><span className="text-sm font-semibold">Centro asignado</span><select value={form.center} onChange={(event) => update('center', event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><option value="" disabled>Seleccionar centro</option>{centers.map((center) => <option key={center} value={center}>{center}</option>)}</select></label>
          {roleCopy.level && <fieldset><legend className="text-sm font-semibold">Nivel de prioridad/canal</legend><p className="mt-1 text-xs text-slate-500">La clasificación organiza prioridad y canal; no constituye diagnóstico ni prescripción.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[[1, 'N1 · Urgencia'], [2, 'N2 · Consulta no aguda'], [3, 'N3 · Gestión']].map(([level, label]) => (<label key={level} className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><input type="radio" name="level" checked={Number(form.level) === level} onChange={() => update('level', level)} className="mt-1" /><span>{label}</span></label>))}</div></fieldset>}
          {roleCopy.level && Number(form.level) === 1 && <div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100"><strong>Nivel 1:</strong> realizar llamada telefónica directa al facultativo. La web NO sustituye ni debe retrasar esa llamada.</div>}
          {roleCopy.level && Number(form.level) === 3 && <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">Gestión/documentación puede diseñarse, pero cualquier indicación médica remota, prescripción o actuación enfermera dependiente de validación jurídica permanece <strong>BLOQUEADA PARA ACTIVACIÓN REAL</strong>.</div>}
          {!roleCopy.level && <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">Consulta propia de {roleCopy.label}. No habilita respuesta facultativa ni modificación de medicación o indicaciones médicas.</div>}
          <label className="block"><span className="text-sm font-semibold">Situación</span><textarea value={form.summary} onChange={(event) => update('summary', event.target.value)} required rows={7} maxLength={4000} placeholder="Descripción de la situación clínica." className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /></label>
          <button type="submit" disabled={state === 'SAVING' || centers.length === 0} className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{state === 'SAVING' ? 'Abriendo…' : `Abrir ${session.role === 'nurse' ? 'caso' : 'consulta'}`}</button>
          {centers.length === 0 && <p role="alert" className="text-sm text-red-300">Esta identidad no tiene centros asignados; la apertura queda bloqueada.</p>}
          {state === 'ERROR' && <p role="alert" className="text-sm text-red-300">Apertura bloqueada de forma segura. Código mínimo: {errorCode}.</p>}
          {state === 'SAVED' && createdEpisode && <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">Episodio creado por la sesión autenticada: <strong>{createdEpisode.id}</strong>. Estado {createdEpisode.status || 'ABIERTO'} · {createdEpisode.discipline || roleCopy.label}.<div className="mt-3 flex flex-wrap gap-4"><Link to={`/interno/prototipo-clinico/caso/${encodeURIComponent(createdEpisode.id)}`} className="font-semibold underline">Abrir este episodio</Link><Link to="/interno/prototipo-clinico" className="underline">Volver al listado</Link></div></div>}
        </form>
      </div>
    </main>
  );
}