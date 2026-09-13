import React, { useCallback, useEffect, useMemo, useState } from 'react';
import InternalClinicalPrototype from '@/pages/InternalClinicalPrototype';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
import { createInternalClinicalApi } from '@/lib/internalClinicalApi';
import { loadAuthoritativeEpisodes } from '@/lib/internalClinicalAuthority';
import { submitAuthoritativePhysicianResponse } from '@/lib/internalClinicalActions';

function CentralClinicalView({ session }) {
  const api = useMemo(() => createInternalClinicalApi({ actorId: session.id }), [session.id]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [state, setState] = useState('LOADING');
  const [errorCode, setErrorCode] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseState, setResponseState] = useState('IDLE');
  const [responseErrorCode, setResponseErrorCode] = useState(null);

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
  const canRespond = session.role === 'physician' && selected && selected.status !== 'CERRADO';

  const submitResponse = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setResponseState('SAVING');
    setResponseErrorCode(null);
    const result = await submitAuthoritativePhysicianResponse({
      api,
      session,
      episodeId: selected.id,
      text: responseText,
    });
    if (!result.ok) {
      setResponseState('ERROR');
      setResponseErrorCode(result.errorCode);
      return;
    }
    setEpisodes((current) => current.map((item) => item.id === result.episode.id ? result.episode : item));
    setResponseText('');
    setResponseState('SAVED');
  };

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
            <p className="text-slate-400 mt-1">Autoridad sintética · identidad {session.id} · {session.roleLabel}</p>
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
                  <button key={episode.id} type="button" onClick={() => { setSelectedId(episode.id); setResponseState('IDLE'); setResponseErrorCode(null); }} className={`w-full text-left rounded-lg border p-3 ${episode.id === selectedId ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-800 bg-slate-950'}`}>
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

                {session.role === 'physician' && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="font-semibold">Respuesta facultativa sintética</h3>
                    <p className="text-xs text-slate-400 mt-1">La respuesta escrita queda atribuida al facultativo. RESPONDIDO/EMITIDA no acredita entrega, lectura ni ejecución.</p>
                    {canRespond ? (
                      <form onSubmit={submitResponse} className="mt-3 space-y-3">
                        <textarea
                          value={responseText}
                          onChange={(event) => setResponseText(event.target.value)}
                          rows={5}
                          maxLength={4000}
                          required
                          placeholder="Contenido sintético de respuesta médica. No usar datos reales."
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
                        />
                        <button type="submit" disabled={responseState === 'SAVING'} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
                          {responseState === 'SAVING' ? 'Registrando…' : 'Registrar respuesta sintética'}
                        </button>
                      </form>
                    ) : <p className="mt-3 text-sm text-slate-400">El episodio cerrado no admite nuevas respuestas.</p>}
                    {responseState === 'SAVED' && <p role="status" className="mt-3 text-sm text-emerald-300">Respuesta registrada en la autoridad sintética y reflejada en el episodio.</p>}
                    {responseState === 'ERROR' && <p role="alert" className="mt-3 text-sm text-red-300">Operación bloqueada. Código mínimo: {responseErrorCode}.</p>}
                  </div>
                )}

                <p className="mt-5 text-xs text-slate-500">Las demás mutaciones autoritativas se conectarán por etapas para evitar dos fuentes de verdad.</p>
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
