import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, HeartPulse, History, LockKeyhole, LogOut, PhoneCall, Plus, Send, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';

const ROLES = {
  nurse: { label: 'Enfermería', icon: HeartPulse },
  physician: { label: 'Facultativo', icon: Stethoscope },
  admin: { label: 'Administración / Coordinación', icon: UserCog },
};

const LEVELS = {
  1: { label: 'Nivel 1 · Urgencia', description: 'Registro + llamada telefónica directa. La plataforma no sustituye la llamada.' },
  2: { label: 'Nivel 2 · Consulta médica no aguda', description: 'Canal escrito que requiere criterio facultativo.' },
  3: { label: 'Nivel 3 · Gestión', description: 'Gestión o documentación. Funciones clínicas condicionadas permanecen bloqueadas.' },
};

const initialCases = [
  {
    id: 'DEMO-2026-001', patientRef: 'PACIENTE-DEMO-A', center: 'Centro ficticio Madrid 01', level: 2, status: 'ABIERTO',
    summary: 'Paciente sintético con mareo leve tras actividad. Sin datos reales.', createdBy: 'Enfermera Demo 01', createdById: 'USR-DEMO-NURSE-01', createdAt: '2026-09-12 12:10', response: '',
    audit: [{ at: '2026-09-12 12:10', actor: 'Enfermera Demo 01', actorId: 'USR-DEMO-NURSE-01', role: 'Enfermería', action: 'Caso creado · Nivel 2' }],
    addenda: [], levelHistory: [],
  },
  {
    id: 'DEMO-2026-002', patientRef: 'PACIENTE-DEMO-B', center: 'Centro ficticio Madrid 01', level: 1, status: 'RESPONDIDO',
    summary: 'Escenario sintético de dolor torácico para probar contingencia y trazabilidad.', createdBy: 'Enfermera Demo 01', createdById: 'USR-DEMO-NURSE-01', createdAt: '2026-09-12 11:35',
    response: 'Respuesta sintética: circuito urgente atendido por teléfono. No constituye indicación clínica real.', respondedBy: 'Dr. Demo 01', respondedById: 'USR-DEMO-PHYS-01', respondedAt: '2026-09-12 11:39',
    audit: [
      { at: '2026-09-12 11:35', actor: 'Enfermera Demo 01', actorId: 'USR-DEMO-NURSE-01', role: 'Enfermería', action: 'Caso creado · Nivel 1' },
      { at: '2026-09-12 11:36', actor: 'Enfermera Demo 01', actorId: 'USR-DEMO-NURSE-01', role: 'Enfermería', action: 'Llamada telefónica directa registrada (simulación)' },
      { at: '2026-09-12 11:39', actor: 'Dr. Demo 01', actorId: 'USR-DEMO-PHYS-01', role: 'Facultativo', action: 'Respuesta registrada' },
    ], addenda: [], levelHistory: [],
  },
];

const statusBadge = (status) => ({
  ABIERTO: 'bg-amber-100 text-amber-800 border-amber-200',
  RESPONDIDO: 'bg-blue-100 text-blue-800 border-blue-200',
  CERRADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}[status] || 'bg-slate-100 text-slate-700 border-slate-200');

const now = () => new Date().toLocaleString('es-ES', { hour12: false });

export default function InternalClinicalPrototype() {
  const navigate = useNavigate();
  const { session, signOut } = useInternalPrototypeAuth();
  const role = session?.role;
  const [cases, setCases] = useState(initialCases);
  const [selectedId, setSelectedId] = useState(initialCases[0].id);
  const [showCreate, setShowCreate] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [addendumText, setAddendumText] = useState('');
  const [draft, setDraft] = useState({ patientRef: 'PACIENTE-DEMO-C', center: 'Centro ficticio Madrid 01', level: 2, summary: '' });

  const selected = useMemo(() => cases.find((item) => item.id === selectedId) || cases[0], [cases, selectedId]);
  const visibleCases = useMemo(() => {
    if (role === 'physician') return cases.filter((item) => item.status !== 'CERRADO');
    if (role === 'nurse') return cases.filter((item) => session?.centers?.includes(item.center));
    return cases;
  }, [cases, role, session]);
  const pendingCount = visibleCases.filter((item) => item.status !== 'CERRADO').length;
  const RoleIcon = ROLES[role]?.icon || LockKeyhole;

  if (!session) return null;

  const actor = () => ({ actor: session.displayName, actorId: session.id, role: session.roleLabel });
  const patchCase = (caseId, patch, auditAction) => {
    const timestamp = now();
    setCases((current) => current.map((item) => item.id === caseId ? {
      ...item,
      ...patch,
      audit: auditAction ? [...item.audit, { at: timestamp, ...actor(), action: auditAction }] : item.audit,
    } : item));
  };

  const createCase = (event) => {
    event.preventDefault();
    if (role !== 'nurse' || !draft.summary.trim()) return;
    const timestamp = now();
    const id = `DEMO-${Date.now()}`;
    const level = Number(draft.level);
    const next = {
      id, patientRef: draft.patientRef.trim() || 'PACIENTE-DEMO', center: draft.center.trim() || session.centers[0], level, status: 'ABIERTO', summary: draft.summary.trim(),
      createdBy: session.displayName, createdById: session.id, createdAt: timestamp, response: '', addenda: [], levelHistory: [],
      audit: [{ at: timestamp, ...actor(), action: `Caso creado · Nivel ${level}` }],
    };
    setCases((current) => [next, ...current]);
    setSelectedId(id);
    setShowCreate(false);
    setDraft({ patientRef: 'PACIENTE-DEMO-C', center: session.centers[0], level: 2, summary: '' });
  };

  const changeLevel = (nextLevel) => {
    if (role !== 'nurse' || !selected || selected.status === 'CERRADO' || selected.level === nextLevel) return;
    const timestamp = now();
    const previous = selected.level;
    setCases((current) => current.map((item) => item.id === selected.id ? {
      ...item,
      level: nextLevel,
      levelHistory: [...item.levelHistory, { at: timestamp, ...actor(), from: previous, to: nextLevel }],
      audit: [...item.audit, { at: timestamp, ...actor(), action: `Nivel cambiado N${previous} → N${nextLevel}` }],
    } : item));
  };

  const submitResponse = () => {
    if (role !== 'physician' || !selected || !responseText.trim() || selected.status === 'CERRADO') return;
    const timestamp = now();
    patchCase(selected.id, { response: responseText.trim(), respondedBy: session.displayName, respondedById: session.id, respondedAt: timestamp, status: 'RESPONDIDO' }, 'Respuesta facultativa registrada');
    setResponseText('');
  };

  const addAddendum = () => {
    if (!selected || !addendumText.trim() || role === 'admin') return;
    const timestamp = now();
    setCases((current) => current.map((item) => item.id === selected.id ? {
      ...item,
      addenda: [...item.addenda, { at: timestamp, ...actor(), text: addendumText.trim() }],
      audit: [...item.audit, { at: timestamp, ...actor(), action: 'Adenda añadida; contenido previo conservado' }],
    } : item));
    setAddendumText('');
  };

  const closeCase = () => {
    if (!selected || selected.status !== 'RESPONDIDO' || !['nurse', 'physician'].includes(role)) return;
    const timestamp = now();
    patchCase(selected.id, { status: 'CERRADO', closedBy: session.displayName, closedById: session.id, closedAt: timestamp }, 'Caso cerrado');
  };

  const logout = () => { signOut(); navigate('/interno/acceso'); };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="internal-clinical-prototype">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 mb-6 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
          <div><p className="font-semibold text-amber-200">PROTOTIPO CLÍNICO · SOLO DATOS SINTÉTICOS</p><p className="text-sm text-amber-100/80">No autorizado para asistencia real ni datos de salud reales. DP-01/MED-01 y los gates del Frente B siguen abiertos.</p></div>
        </div>

        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div><div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold mb-2"><ShieldCheck className="w-4 h-4" /> GASI · Entorno interno de prueba</div><h1 className="text-3xl md:text-4xl font-bold">Canal Enfermería ↔ Facultativo</h1><p className="text-slate-400 mt-2">ABIERTO → RESPONDIDO → CERRADO. Sin diagnóstico automatizado, receta ni motor de prescripción.</p></div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 min-w-[310px]">
            <p className="text-xs uppercase text-slate-500">Identidad individual activa</p><p className="font-bold mt-1">{session.displayName}</p><p className="text-sm text-slate-400">{session.roleLabel} · {session.id}</p>
            <button type="button" onClick={logout} className="mt-3 inline-flex items-center gap-2 text-sm rounded-lg border border-slate-700 px-3 py-2"><LogOut className="w-4 h-4" />Cerrar sesión</button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4"><p className="text-slate-500 text-sm">Rol autorizado</p><p className="font-semibold flex items-center gap-2 mt-1"><RoleIcon className="w-5 h-5 text-cyan-300" />{session.roleLabel}</p></div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4"><p className="text-slate-500 text-sm">Pendientes visibles</p><p className="text-2xl font-bold mt-1">{pendingCount}</p></div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4"><p className="text-slate-500 text-sm">Persistencia</p><p className="font-semibold mt-1 flex items-center gap-2"><LockKeyhole className="w-5 h-5 text-emerald-300" />Solo memoria del prototipo</p></div>
        </section>

        {role === 'nurse' && <div className="mb-5"><button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 text-slate-950 font-semibold px-4 py-2"><Plus className="w-4 h-4" />Abrir caso sintético</button></div>}

        {showCreate && role === 'nurse' && (
          <form onSubmit={createCase} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 mb-6 grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1">Referencia sintética</label><input value={draft.patientRef} onChange={(e) => setDraft({ ...draft, patientRef: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" /></div>
            <div><label className="block text-sm text-slate-400 mb-1">Centro ficticio</label><select value={draft.center} onChange={(e) => setDraft({ ...draft, center: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2">{session.centers.map((center) => <option key={center}>{center}</option>)}</select></div>
            <div><label className="block text-sm text-slate-400 mb-1">Nivel de escalado</label><select value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"><option value={1}>Nivel 1 · Urgencia</option><option value={2}>Nivel 2 · Consulta no aguda</option><option value={3}>Nivel 3 · Gestión</option></select></div>
            <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Situación asistencial sintética</label><textarea required value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={3} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" /></div>
            {Number(draft.level) === 1 && <div className="md:col-span-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-red-100 flex gap-2"><PhoneCall className="w-5 h-5 shrink-0" /><span><strong>Nivel 1:</strong> registrar y llamar directamente al facultativo. La web no sustituye ni retrasa la llamada urgente.</span></div>}
            {Number(draft.level) === 3 && <div className="md:col-span-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-amber-100">Indicación, prescripción y actuación derivada: <strong>BLOQUEADAS PARA ACTIVACIÓN REAL</strong>.</div>}
            <div className="md:col-span-2"><button type="submit" className="rounded-lg bg-cyan-400 text-slate-950 font-semibold px-4 py-2">Crear caso</button></div>
          </form>
        )}

        {role === 'admin' ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-bold mb-3 flex items-center gap-2"><UserCog className="w-5 h-5 text-cyan-300" />Panel de coordinación</h2><p className="text-slate-400 mb-5">Solo metadatos operativos; esta vista no expone el contenido clínico.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500 border-b border-slate-800"><tr><th className="py-2">Caso</th><th>Centro</th><th>Nivel</th><th>Estado</th><th>Creación</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id} className="border-b border-slate-800/70"><td className="py-3 font-mono">{item.id}</td><td>{item.center}</td><td>N{item.level}</td><td><span className={`px-2 py-1 rounded-full border text-xs ${statusBadge(item.status)}`}>{item.status}</span></td><td>{item.createdAt}</td></tr>)}</tbody></table></div></section>
        ) : (
          <section className="grid lg:grid-cols-[360px_1fr] gap-5">
            <aside className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden"><div className="p-4 border-b border-slate-800"><h2 className="font-bold">{role === 'physician' ? 'Entradas pendientes' : 'Casos del centro asignado'}</h2></div><div className="divide-y divide-slate-800 max-h-[680px] overflow-y-auto">{visibleCases.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full text-left p-4 hover:bg-slate-800/60 ${selectedId === item.id ? 'bg-slate-800' : ''}`}><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-slate-400">{item.id}</span><span className={`px-2 py-1 rounded-full border text-[11px] ${statusBadge(item.status)}`}>{item.status}</span></div><p className="font-semibold mt-2">{item.patientRef}</p><p className="text-sm text-slate-500 mt-1">N{item.level} · {item.center}</p></button>)}</div></aside>

            {selected && visibleCases.some((item) => item.id === selected.id) && (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                <div className="flex flex-wrap justify-between gap-3 border-b border-slate-800 pb-5 mb-5"><div><p className="font-mono text-xs text-slate-500">{selected.id}</p><h2 className="text-2xl font-bold mt-1">{selected.patientRef}</h2><p className="text-slate-500 mt-1">{selected.center}</p></div><div className="text-right"><span className={`px-3 py-1 rounded-full border text-xs ${statusBadge(selected.status)}`}>{selected.status}</span><p className="text-sm text-slate-500 mt-2">{LEVELS[selected.level].label}</p></div></div>
                {selected.level === 1 && <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-100 mb-5 flex gap-3"><PhoneCall className="w-5 h-5 shrink-0" /><div><p className="font-bold">Urgencia · teléfono directo</p><p className="text-sm mt-1">El registro acompaña el circuito; nunca sustituye la llamada ni debe retrasar una emergencia.</p></div></div>}
                {selected.level === 3 && <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-100 mb-5"><strong>Gate jurídico:</strong> indicación, prescripción y actuación enfermera derivada permanecen bloqueadas para activación real.</div>}

                {role === 'nurse' && selected.status !== 'CERRADO' && <div className="mb-5"><label className="block text-sm text-slate-400 mb-1">Cambiar nivel de escalado</label><select value={selected.level} onChange={(e) => changeLevel(Number(e.target.value))} className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"><option value={1}>Nivel 1</option><option value={2}>Nivel 2</option><option value={3}>Nivel 3</option></select><p className="text-xs text-slate-500 mt-1">Todo cambio conserva nivel anterior, autor y fecha.</p></div>}

                <section className="mb-5"><h3 className="font-semibold mb-2">Situación registrada por Enfermería</h3><div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">{selected.summary}</div></section>
                <section className="mb-5"><h3 className="font-semibold mb-2">Respuesta facultativa</h3>{selected.response ? <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-100">{selected.response}</div> : <div className="rounded-xl border border-dashed border-slate-700 p-4 text-slate-500">Pendiente de facultativo.</div>}</section>

                {role === 'physician' && selected.status !== 'CERRADO' && <section className="mb-5 rounded-xl border border-slate-700 p-4"><label className="block font-semibold mb-2">Registrar respuesta sintética</label><textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" placeholder="Solo contenido ficticio." /><button type="button" onClick={submitResponse} disabled={!responseText.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold px-4 py-2"><Send className="w-4 h-4" />Registrar respuesta</button></section>}

                {['nurse', 'physician'].includes(role) && <section className="mb-5 rounded-xl border border-slate-800 p-4"><label className="block font-semibold mb-2">Añadir adenda</label><textarea value={addendumText} onChange={(e) => setAddendumText(e.target.value)} rows={2} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" placeholder="La adenda no elimina ni sustituye el contenido anterior." /><button type="button" onClick={addAddendum} disabled={!addendumText.trim()} className="mt-3 rounded-lg border border-cyan-400/40 text-cyan-200 disabled:opacity-40 px-4 py-2">Añadir adenda</button>{selected.addenda.length > 0 && <div className="mt-4 space-y-2">{selected.addenda.map((entry, index) => <div key={`${entry.at}-${index}`} className="rounded-lg bg-slate-950 p-3 text-sm"><p className="text-slate-500">{entry.at} · {entry.actor} · {entry.role}</p><p className="mt-1 text-slate-300">{entry.text}</p></div>)}</div>}</section>}

                {['nurse', 'physician'].includes(role) && selected.status === 'RESPONDIDO' && <button type="button" onClick={closeCase} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 text-emerald-200 px-4 py-2 mb-6"><CheckCircle2 className="w-4 h-4" />Cerrar caso</button>}

                <section className="border-t border-slate-800 pt-5"><h3 className="font-semibold mb-3 flex items-center gap-2"><History className="w-4 h-4 text-cyan-300" />Trazabilidad append-only del prototipo</h3><div className="space-y-3">{selected.audit.map((entry, index) => <div key={`${entry.at}-${index}`} className="grid md:grid-cols-[170px_1fr] gap-2 text-sm"><div className="text-slate-500 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{entry.at}</div><div><span className="font-semibold">{entry.actor}</span><span className="text-slate-500"> · {entry.role} · {entry.actorId}</span><p className="text-slate-300 mt-0.5">{entry.action}</p></div></div>)}</div></section>
              </article>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
