import React, { useMemo, useState } from 'react';
import { ShieldCheck, Stethoscope, HeartPulse, UserCog, PhoneCall, Plus, Send, CheckCircle2, AlertTriangle, Clock3, History, LockKeyhole } from 'lucide-react';

const ROLES = {
  nurse: { label: 'Enfermería', icon: HeartPulse },
  physician: { label: 'Facultativo', icon: Stethoscope },
  admin: { label: 'Administración / Coordinación', icon: UserCog },
};

const LEVELS = {
  1: { label: 'Nivel 1 · Urgencia', description: 'Registrar y llamar directamente al facultativo. La web no sustituye la llamada.' },
  2: { label: 'Nivel 2 · Consulta médica no aguda', description: 'Consulta escrita que requiere criterio facultativo dentro del circuito autorizado.' },
  3: { label: 'Nivel 3 · Gestión', description: 'Gestión, informe o documentación. Las funciones clínicas pendientes permanecen bloqueadas.' },
};

const initialCases = [
  {
    id: 'DEMO-2026-001',
    patientRef: 'PACIENTE-DEMO-A',
    center: 'Centro ficticio Madrid 01',
    level: 2,
    status: 'ABIERTO',
    summary: 'Paciente sintético con mareo leve tras actividad. Sin datos reales.',
    createdBy: 'Enfermera Demo 01',
    createdAt: '2026-09-12 12:10',
    response: '',
    audit: [
      { at: '2026-09-12 12:10', actor: 'Enfermera Demo 01', role: 'Enfermería', action: 'Caso creado · Nivel 2' },
    ],
  },
  {
    id: 'DEMO-2026-002',
    patientRef: 'PACIENTE-DEMO-B',
    center: 'Centro ficticio Madrid 01',
    level: 1,
    status: 'RESPONDIDO',
    summary: 'Escenario sintético de dolor torácico para probar contingencia y trazabilidad.',
    createdBy: 'Enfermera Demo 02',
    createdAt: '2026-09-12 11:35',
    response: 'Respuesta sintética: circuito urgente atendido por teléfono. No constituye indicación clínica real.',
    respondedBy: 'Dr. Demo 01',
    respondedAt: '2026-09-12 11:39',
    audit: [
      { at: '2026-09-12 11:35', actor: 'Enfermera Demo 02', role: 'Enfermería', action: 'Caso creado · Nivel 1' },
      { at: '2026-09-12 11:36', actor: 'Enfermera Demo 02', role: 'Enfermería', action: 'Llamada telefónica directa registrada (simulación)' },
      { at: '2026-09-12 11:39', actor: 'Dr. Demo 01', role: 'Facultativo', action: 'Respuesta registrada' },
    ],
  },
];

const badge = (status) => {
  const map = {
    ABIERTO: 'bg-amber-100 text-amber-800 border-amber-200',
    RESPONDIDO: 'bg-blue-100 text-blue-800 border-blue-200',
    CERRADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function InternalClinicalPrototype() {
  const [role, setRole] = useState('nurse');
  const [cases, setCases] = useState(initialCases);
  const [selectedId, setSelectedId] = useState(initialCases[0].id);
  const [showCreate, setShowCreate] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [draft, setDraft] = useState({ patientRef: 'PACIENTE-DEMO-C', center: 'Centro ficticio Madrid 01', level: 2, summary: '' });

  const selected = useMemo(() => cases.find((item) => item.id === selectedId) || cases[0], [cases, selectedId]);
  const pendingCount = cases.filter((item) => item.status !== 'CERRADO').length;
  const RoleIcon = ROLES[role].icon;

  const addAudit = (caseId, entry, patch = {}) => {
    setCases((current) => current.map((item) => item.id === caseId
      ? { ...item, ...patch, audit: [...item.audit, entry] }
      : item));
  };

  const createCase = (event) => {
    event.preventDefault();
    if (!draft.summary.trim()) return;
    const timestamp = new Date().toLocaleString('es-ES', { hour12: false });
    const id = `DEMO-${Date.now()}`;
    const next = {
      id,
      patientRef: draft.patientRef.trim() || 'PACIENTE-DEMO',
      center: draft.center.trim() || 'Centro ficticio',
      level: Number(draft.level),
      status: 'ABIERTO',
      summary: draft.summary.trim(),
      createdBy: 'Enfermera Demo Sesión',
      createdAt: timestamp,
      response: '',
      audit: [{ at: timestamp, actor: 'Enfermera Demo Sesión', role: 'Enfermería', action: `Caso creado · Nivel ${draft.level}` }],
    };
    setCases((current) => [next, ...current]);
    setSelectedId(id);
    setDraft({ patientRef: 'PACIENTE-DEMO-C', center: 'Centro ficticio Madrid 01', level: 2, summary: '' });
    setShowCreate(false);
  };

  const submitResponse = () => {
    if (!selected || !responseText.trim() || role !== 'physician' || selected.status === 'CERRADO') return;
    const timestamp = new Date().toLocaleString('es-ES', { hour12: false });
    addAudit(selected.id, {
      at: timestamp,
      actor: 'Dr. Demo Sesión',
      role: 'Facultativo',
      action: 'Respuesta registrada',
    }, {
      response: responseText.trim(),
      respondedBy: 'Dr. Demo Sesión',
      respondedAt: timestamp,
      status: 'RESPONDIDO',
    });
    setResponseText('');
  };

  const closeCase = () => {
    if (!selected || selected.status !== 'RESPONDIDO') return;
    const timestamp = new Date().toLocaleString('es-ES', { hour12: false });
    const actor = role === 'physician' ? 'Dr. Demo Sesión' : 'Enfermera Demo Sesión';
    const actorRole = role === 'physician' ? 'Facultativo' : 'Enfermería';
    addAudit(selected.id, { at: timestamp, actor, role: actorRole, action: 'Caso cerrado' }, { status: 'CERRADO', closedBy: actor, closedAt: timestamp });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="internal-clinical-prototype">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 mb-6 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-200">PROTOTIPO CLÍNICO · SOLO DATOS SINTÉTICOS</p>
            <p className="text-sm text-amber-100/80">No autorizado para asistencia real ni para almacenar datos de salud. La activación real permanece bloqueada hasta aprobar el Frente B europeo, privacidad, seguridad, roles y gates jurídicos.</p>
          </div>
        </div>

        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold mb-2"><ShieldCheck className="w-4 h-4" /> GASI · Entorno interno de prueba</div>
            <h1 className="text-3xl md:text-4xl font-bold">Canal Enfermería ↔ Facultativo</h1>
            <p className="text-slate-400 mt-2 max-w-3xl">Flujo mínimo trazable: ABIERTO → RESPONDIDO → CERRADO. Sin diagnóstico automatizado, sin receta y sin motor de prescripción.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 min-w-[290px]">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Simular interfaz por rol</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ROLES).map(([key, value]) => (
                <button key={key} type="button" onClick={() => setRole(key)} className={`px-3 py-2 rounded-lg text-sm border ${role === key ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>
                  {value.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Selector exclusivo de prototipo; no sustituye autenticación ni RBAC real.</p>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4"><p className="text-slate-500 text-sm">Rol simulado</p><p className="font-semibold flex items-center gap-2 mt-1"><RoleIcon className="w-5 h-5 text-cyan-300" />{ROLES[role].label}</p></div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4"><p className="text-slate-500 text-sm">Casos pendientes</p><p className="text-2xl font-bold mt-1">{pendingCount}</p></div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4"><p className="text-slate-500 text-sm">Seguridad de prueba</p><p className="font-semibold mt-1 flex items-center gap-2"><LockKeyhole className="w-5 h-5 text-emerald-300" />Sin persistencia clínica real</p></div>
        </section>

        {role === 'nurse' && (
          <div className="mb-5">
            <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold px-4 py-2">
              <Plus className="w-4 h-4" /> Abrir caso sintético
            </button>
          </div>
        )}

        {showCreate && role === 'nurse' && (
          <form onSubmit={createCase} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 mb-6 grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1">Referencia de paciente sintético</label><input value={draft.patientRef} onChange={(e) => setDraft({ ...draft, patientRef: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" /></div>
            <div><label className="block text-sm text-slate-400 mb-1">Centro ficticio</label><input value={draft.center} onChange={(e) => setDraft({ ...draft, center: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" /></div>
            <div><label className="block text-sm text-slate-400 mb-1">Nivel</label><select value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"><option value={1}>Nivel 1 · Urgencia</option><option value={2}>Nivel 2 · Consulta no aguda</option><option value={3}>Nivel 3 · Gestión</option></select></div>
            <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">Situación asistencial sintética</label><textarea required value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={3} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" placeholder="Describe un escenario ficticio, sin datos reales." /></div>
            {Number(draft.level) === 1 && <div className="md:col-span-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-red-100 flex gap-2"><PhoneCall className="w-5 h-5 shrink-0" /><span><strong>Nivel 1:</strong> registrar y efectuar llamada telefónica directa. La plataforma no sustituye la llamada urgente.</span></div>}
            {Number(draft.level) === 3 && <div className="md:col-span-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-amber-100">Prescripción, indicación médica remota y actuación derivada permanecen <strong>BLOQUEADAS PARA ACTIVACIÓN REAL</strong> mientras sigan abiertos los gates jurídicos.</div>}
            <div className="md:col-span-2"><button type="submit" className="rounded-lg bg-cyan-400 text-slate-950 font-semibold px-4 py-2">Crear caso de prueba</button></div>
          </form>
        )}

        {role === 'admin' ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><UserCog className="w-5 h-5 text-cyan-300" /> Panel de coordinación</h2>
            <p className="text-slate-400 mb-5">La coordinación puede ver metadatos operativos del prototipo, pero esta vista evita exponer el contenido clínico de los casos.</p>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500 border-b border-slate-800"><tr><th className="py-2">Caso</th><th>Centro</th><th>Nivel</th><th>Estado</th><th>Creación</th></tr></thead><tbody>{cases.map((item) => <tr key={item.id} className="border-b border-slate-800/70"><td className="py-3 font-mono">{item.id}</td><td>{item.center}</td><td>N{item.level}</td><td><span className={`px-2 py-1 rounded-full border text-xs ${badge(item.status)}`}>{item.status}</span></td><td>{item.createdAt}</td></tr>)}</tbody></table></div>
          </section>
        ) : (
          <section className="grid lg:grid-cols-[360px_1fr] gap-5">
            <aside className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-800"><h2 className="font-bold">{role === 'physician' ? 'Entradas pendientes' : 'Casos del centro'}</h2></div>
              <div className="divide-y divide-slate-800 max-h-[680px] overflow-y-auto">
                {cases.filter((item) => role !== 'physician' || item.status !== 'CERRADO').map((item) => (
                  <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full text-left p-4 hover:bg-slate-800/60 ${selectedId === item.id ? 'bg-slate-800' : ''}`}>
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-slate-400">{item.id}</span><span className={`px-2 py-1 rounded-full border text-[11px] ${badge(item.status)}`}>{item.status}</span></div>
                    <p className="font-semibold mt-2">{item.patientRef}</p><p className="text-sm text-slate-500 mt-1">N{item.level} · {item.center}</p>
                  </button>
                ))}
              </div>
            </aside>

            {selected && (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
                <div className="flex flex-wrap justify-between gap-3 border-b border-slate-800 pb-5 mb-5">
                  <div><p className="font-mono text-xs text-slate-500">{selected.id}</p><h2 className="text-2xl font-bold mt-1">{selected.patientRef}</h2><p className="text-slate-500 mt-1">{selected.center}</p></div>
                  <div className="text-right"><span className={`px-3 py-1 rounded-full border text-xs ${badge(selected.status)}`}>{selected.status}</span><p className="text-sm text-slate-500 mt-2">{LEVELS[selected.level].label}</p></div>
                </div>

                {selected.level === 1 && <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-100 mb-5 flex gap-3"><PhoneCall className="w-5 h-5 shrink-0" /><div><p className="font-bold">Urgencia · canal telefónico directo obligatorio</p><p className="text-sm mt-1">Este registro acompaña el circuito. Nunca debe sustituir la llamada al facultativo ni retrasar la respuesta de emergencia correspondiente.</p></div></div>}
                {selected.level === 3 && <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-100 mb-5"><strong>Gate jurídico:</strong> cualquier función de indicación, prescripción o actuación enfermera derivada permanece bloqueada para activación real.</div>}

                <div className="grid md:grid-cols-2 gap-4 mb-5"><div className="rounded-xl bg-slate-950 p-4"><p className="text-xs uppercase text-slate-500">Creado por</p><p className="font-semibold mt-1">{selected.createdBy}</p><p className="text-sm text-slate-500">{selected.createdAt}</p></div><div className="rounded-xl bg-slate-950 p-4"><p className="text-xs uppercase text-slate-500">Estado de respuesta</p><p className="font-semibold mt-1">{selected.respondedBy || 'Pendiente de facultativo'}</p><p className="text-sm text-slate-500">{selected.respondedAt || '—'}</p></div></div>

                <section className="mb-5"><h3 className="font-semibold mb-2">Situación registrada por Enfermería</h3><div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">{selected.summary}</div></section>

                <section className="mb-5"><h3 className="font-semibold mb-2">Respuesta facultativa</h3>{selected.response ? <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-100">{selected.response}</div> : <div className="rounded-xl border border-dashed border-slate-700 p-4 text-slate-500">Aún no existe respuesta registrada.</div>}</section>

                {role === 'physician' && selected.status !== 'CERRADO' && (
                  <section className="mb-5 rounded-xl border border-slate-700 p-4"><label className="block font-semibold mb-2">Registrar respuesta sintética</label><textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" placeholder="Solo contenido ficticio. No introducir datos reales ni emitir prescripción real." /><button type="button" onClick={submitResponse} disabled={!responseText.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold px-4 py-2"><Send className="w-4 h-4" /> Registrar respuesta</button></section>
                )}

                {(role === 'nurse' || role === 'physician') && selected.status === 'RESPONDIDO' && <button type="button" onClick={closeCase} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 text-emerald-200 px-4 py-2 mb-6"><CheckCircle2 className="w-4 h-4" /> Cerrar caso</button>}

                <section className="border-t border-slate-800 pt-5"><h3 className="font-semibold mb-3 flex items-center gap-2"><History className="w-4 h-4 text-cyan-300" /> Trazabilidad del caso</h3><div className="space-y-3">{selected.audit.map((entry, index) => <div key={`${entry.at}-${index}`} className="grid md:grid-cols-[150px_1fr] gap-2 text-sm"><div className="text-slate-500 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{entry.at}</div><div><span className="font-semibold">{entry.actor}</span><span className="text-slate-500"> · {entry.role}</span><p className="text-slate-300 mt-0.5">{entry.action}</p></div></div>)}</div></section>
              </article>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
