import React, { useCallback, useEffect, useMemo, useState } from 'react';
import InternalClinicalPrototype from '@/pages/InternalClinicalPrototype';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
import { createInternalClinicalApi } from '@/lib/internalClinicalApi';
import { loadAuthoritativeEpisodes } from '@/lib/internalClinicalAuthority';

function CentralClinicalView({ session }) {
  const api = useMemo(() => createInternalClinicalApi({ actorId: session.id }), [session.id]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [state, setState] = useState('LOADING');
  const [errorCode, setErrorCode] = useState(null);

  const load = useCallback(async () => {
    setState('LOADING');
    setErrorCode(null);
    const result = await loadAuthoritativeEpisodes(api);
    if (!result.ok) {
      setEpisodes([]);
      setSelectedId(null);
      setErrorCode(result.errorCode);
      setState('ERROR');
      return;
    }
    setEpisodes(result.episodes);
    setSelectedId((current) => result.episodes.some((item) => item.id === current) ? current : result.episodes[0]?.id || null);
    setState('READY');
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const selected = episodes.find((item) => item.id === selectedId) || null;
  const metadataOnly = session.role === 'admin';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="central-clinical-authority">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 mb-6">
          <p className="font-semibold text-cyan-200">Fuente autoritativa sintética activa</p>
          <p className="text-sm text-slate-300 mt-1">Los casos locales de demostración no se usan como respaldo. Si la API clínica sintética no responde, la vista queda bloqueada de forma segura.</p>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Canal clínico sintético</h1>
            <p className="text-slate-400 mt-1">Lectura autoritativa · identidad {session.id} · {session.roleLabel}</p>
          </div>
          <button type="button" onClick={load} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Actualizar</button>
        </div>

        {state === 'LOADING' && <div role="status" className="rounded-xl border border-slate-800 bg-slate-900 p-5">Cargando episodios sintéticos…</div>}
        {state === 'ERROR' && (
          <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-red-100">
            <p className="font-semibold">Acceso clínico bloqueado de forma segura.</p>
            <p className="text-sm mt-1">No se muestran casos locales ni datos en caché. Código mínimo: {errorCode}.</p>
          </div>
        )}
        {state === 'READY' && episodes.length === 0 && <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">No hay episodios sintéticos visibles para esta identidad.</div>}

        {state === 'READY' && episodes.length > 0 && (
          <div className="grid lg:grid-cols-[320px_1fr] gap-5">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="font-bold mb-3">Episodios visibles</h2>
              <div className="space-y-2">
                {episodes.map((episode) => (
                  <button key={episode.id} type="button" onClick={() => setSelectedId(episode.id)} className={`w-full text-left rounded-lg border p-3 ${episode.id === selectedId ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-800 bg-slate-950'}`}>
                    <p className="font-semibold">{episode.id}</p>
                    <p className="text-xs text-slate-400 mt-1">{episode.center} · N{episode.level} · {episode.status}</p>
                  </button>
                ))}
              </div>
            </section>

            {selected && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap gap-2 text-sm mb-4">
                  <span className="rounded-full bg-slate-800 px-3 py-1">{selected.status}</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1">Nivel {selected.level}</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1">{selected.center}</span>
                </div>
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-slate-500">Caso</dt><dd>{selected.id}</dd></div>
                  <div><dt className="text-slate-500">Creado</dt><dd>{selected.createdAt || '—'}</dd></div>
                  <div><dt className="text-slate-500">Creador</dt><dd>{selected.createdById || '—'}</dd></div>
                  <div><dt className="text-slate-500">Respondido</dt><dd>{selected.respondedAt || '—'}</dd></div>
                  <div><dt className="text-slate-500">Respondedor</dt><dd>{selected.respondedById || '—'}</dd></div>
                  <div><dt className="text-slate-500">Cerrado</dt><dd>{selected.closedAt || '—'}</dd></div>
                </dl>
                {!metadataOnly && (
                  <div className="mt-5 space-y-4">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Referencia sintética</p><p>{selected.patientRef || '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Situación sintética</p><p className="whitespace-pre-wrap">{selected.summary || '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Respuestas</p><p>{selected.responses?.length || 0}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Adendas</p><p>{selected.addenda?.length || 0}</p></div>
                  </div>
                )}
                {metadataOnly && <p className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Administración / Coordinación recibe solo metadatos operativos; no se presenta narrativa clínica.</p>}
                <p className="mt-5 text-xs text-slate-500">Las mutaciones autoritativas se conectarán por etapas. Esta unidad evita dos fuentes de verdad antes de habilitarlas.</p>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function InternalClinicalAuthority() {
  const { session, centralValidationEnabled } = useInternalPrototypeAuth();
  if (!centralValidationEnabled) return <InternalClinicalPrototype />;
  if (!session) return null;
  return <CentralClinicalView session={session} />;
}
