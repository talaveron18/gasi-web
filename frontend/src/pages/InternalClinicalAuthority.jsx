import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InternalClinicalPrototype from '@/pages/InternalClinicalPrototype';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
import { createInternalClinicalApi } from '@/lib/internalClinicalApi';
import { loadAuthoritativeEpisodes, selectAuthoritativeAddendaForDisplay } from '@/lib/internalClinicalAuthority';
import { appendAuthoritativeClinicalAddendum, changeAuthoritativeNurseLevel, closeAuthoritativeClinicalEpisode, submitAuthoritativePhysicianResponse } from '@/lib/internalClinicalActions';

const EMPTY_CLOSURE_OPTIONS = {
  followUpPending: false,
  acknowledgementRequired: false,
  handoffRequired: false,
  handoffAcknowledged: false,
};

function CentralClinicalView({ session }) {
  const api = useMemo(() => createInternalClinicalApi({ actorId: session.id }), [session.id]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [state, setState] = useState('LOADING');
  const [errorCode, setErrorCode] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseState, setResponseState] = useState('IDLE');
  const [responseErrorCode, setResponseErrorCode] = useState(null);
  const [levelState, setLevelState] = useState('IDLE');
  const [levelErrorCode, setLevelErrorCode] = useState(null);
  const [addendumText, setAddendumText] = useState('');
  const [addendumState, setAddendumState] = useState('IDLE');
  const [addendumErrorCode, setAddendumErrorCode] = useState(null);
  const [closureOptions, setClosureOptions] = useState(EMPTY_CLOSURE_OPTIONS);
  const [closureState, setClosureState] = useState('IDLE');
  const [closureErrorCode, setClosureErrorCode] = useState(null);

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
  const visibleAddenda = useMemo(
    () => selectAuthoritativeAddendaForDisplay({ episode: selected, session }),
    [selected, session],
  );
  const canRespond = session.role === 'physician' && selected && selected.status !== 'CERRADO';
  const canChangeLevel = session.role === 'nurse' && selected && selected.status !== 'CERRADO';
  const canAddAddendum = ['nurse', 'physician'].includes(session.role) && selected && selected.status !== 'CERRADO';
  const canClose = ['nurse', 'physician'].includes(session.role) && selected && selected.status === 'RESPONDIDO';
  const latestResponse = selected?.responses?.[selected.responses.length - 1] || null;

  const replaceEpisode = (episode) => {
    setEpisodes((current) => current.map((item) => item.id === episode.id ? episode : item));
  };

  const submitResponse = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setResponseState('SAVING');
    setResponseErrorCode(null);
    const result = await submitAuthoritativePhysicianResponse({ api, session, episodeId: selected.id, text: responseText });
    if (!result.ok) {
      setResponseState('ERROR');
      setResponseErrorCode(result.errorCode);
      return;
    }
    replaceEpisode(result.episode);
    setResponseText('');
    setResponseState('SAVED');
  };

  const changeLevel = async (nextLevel) => {
    if (!selected) return;
    setLevelState('SAVING');
    setLevelErrorCode(null);
    const result = await changeAuthoritativeNurseLevel({
      api,
      session,
      episodeId: selected.id,
      currentLevel: selected.level,
      nextLevel,
      status: selected.status,
    });
    if (!result.ok) {
      setLevelState('ERROR');
      setLevelErrorCode(result.errorCode);
      return;
    }
    replaceEpisode(result.episode);
    setLevelState('SAVED');
  };

  const submitAddendum = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setAddendumState('SAVING');
    setAddendumErrorCode(null);
    const result = await appendAuthoritativeClinicalAddendum({
      api,
      session,
      episodeId: selected.id,
      text: addendumText,
      status: selected.status,
    });
    if (!result.ok) {
      setAddendumState('ERROR');
      setAddendumErrorCode(result.errorCode);
      return;
    }
    replaceEpisode(result.episode);
    setAddendumText('');
    setAddendumState('SAVED');
  };

  const submitClosure = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setClosureState('SAVING');
    setClosureErrorCode(null);
    const result = await closeAuthoritativeClinicalEpisode({
      api,
      session,
      episodeId: selected.id,
      status: selected.status,
      responses: selected.responses,
      ...closureOptions,
    });
    if (!result.ok) {
      setClosureState('ERROR');
      setClosureErrorCode(result.errorCode);
      return;
    }
    replaceEpisode(result.episode);
    setClosureState('SAVED');
  };

  const updateClosureOption = (key, checked) => {
    setClosureOptions((current) => ({
      ...current,
      [key]: checked,
      ...(key === 'handoffRequired' && !checked ? { handoffAcknowledged: false } : {}),
    }));
    setClosureState('IDLE');
    setClosureErrorCode(null);
  };

  const selectEpisode = (episodeId) => {
    setSelectedId(episodeId);
    setResponseState('IDLE');
    setResponseErrorCode(null);
    setLevelState('IDLE');
    setLevelErrorCode(null);
    setAddendumText('');
    setAddendumState('IDLE');
    setAddendumErrorCode(null);
    setClosureOptions(EMPTY_CLOSURE_OPTIONS);
    setClosureState('IDLE');
    setClosureErrorCode(null);
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {session.role === 'nurse' && (
              <Link
                to="/interno/prototipo-clinico/nuevo"
                className="rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
              >
                Abrir caso sintético
              </Link>
            )}
            <button type="button" onClick={load} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Actualizar</button>
          </div>
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
                  <button key={episode.id} type="button" onClick={() => selectEpisode(episode.id)} className={`w-full text-left rounded-lg border p-3 ${episode.id === selectedId ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-800 bg-slate-950'}`}>
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
                  <div><dt className="text-slate-500">Cerrado por</dt><dd>{selected.closedById || '—'}</dd></div>
                </dl>

                {!metadataOnly && (
                  <div className="mt-5 space-y-4">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Referencia sintética</p><p>{selected.patientRef || '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Situación sintética</p><p className="whitespace-pre-wrap">{selected.summary || '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Respuestas</p><p>{selected.responses?.length || 0}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Adendas</p><p>{visibleAddenda.length}</p></div>
                  </div>
                )}
                {metadataOnly && <p className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Administración / Coordinación recibe solo metadatos operativos; no se presenta narrativa clínica.</p>}

                {!metadataOnly && (
                  <div className="mt-6 border-t border-slate-800 pt-5" data-testid="authoritative-addendum-history">
                    <h3 className="font-semibold">Historial de adendas</h3>
                    <p className="text-xs text-slate-400 mt-1">Registro append-only autoritativo. Una adenda complementa o corrige sin borrar ni sustituir el contenido original.</p>
                    {visibleAddenda.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-400">No hay adendas sintéticas válidas registradas.</p>
                    ) : (
                      <ol className="mt-3 space-y-3">
                        {visibleAddenda.map((addendum) => (
                          <li key={addendum.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>{addendum.createdAt}</span>
                              <span>{addendum.authorId}</span>
                              <span>{addendum.authorRole === 'nurse' ? 'Enfermería' : 'Facultativo'}</span>
                              <span>{addendum.id}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{addendum.text}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {session.role === 'nurse' && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="font-semibold">Clasificación y prioridad de Enfermería</h3>
                    <p className="text-xs text-slate-400 mt-1">Organiza prioridad y canal. No constituye diagnóstico, prescripción ni habilitación para ejecutar una indicación médica.</p>
                    {canChangeLevel ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[1, 2, 3].map((level) => (
                          <button
                            key={level}
                            type="button"
                            disabled={levelState === 'SAVING' || selected.level === level}
                            onClick={() => changeLevel(level)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
                          >
                            {level === 1 ? 'N1 · Urgencia' : level === 2 ? 'N2 · Consulta no aguda' : 'N3 · Gestión'}
                          </button>
                        ))}
                      </div>
                    ) : <p className="mt-3 text-sm text-slate-400">El episodio cerrado no admite reclasificación.</p>}
                    {selected.level === 1 && (
                      <div className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
                        <strong>Nivel 1:</strong> realizar llamada telefónica directa al facultativo. La web no sustituye ni retrasa esa llamada.
                      </div>
                    )}
                    {selected.level === 3 && (
                      <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                        Indicación médica remota, prescripción y actuación enfermera derivada permanecen <strong>BLOQUEADAS PARA ACTIVACIÓN REAL</strong> donde dependan de gates jurídicos pendientes.
                      </div>
                    )}
                    {levelState === 'SAVED' && <p role="status" className="mt-3 text-sm text-emerald-300">Nivel actualizado en la autoridad sintética; el cambio queda en su historial autoritativo.</p>}
                    {levelState === 'ERROR' && <p role="alert" className="mt-3 text-sm text-red-300">Reclasificación no aplicada. Código mínimo: {levelErrorCode}.</p>}
                  </div>
                )}

                {!metadataOnly && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="font-semibold">Corrección / complemento mediante adenda</h3>
                    <p className="text-xs text-slate-400 mt-1">No modifica ni elimina el original. Cada adenda queda como entrada separada y atribuida en la autoridad sintética.</p>
                    {canAddAddendum ? (
                      <form onSubmit={submitAddendum} className="mt-3 space-y-3">
                        <textarea
                          value={addendumText}
                          onChange={(event) => setAddendumText(event.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder="Texto sintético de corrección o complemento"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
                        />
                        <button type="submit" disabled={addendumState === 'SAVING'} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-40">
                          {addendumState === 'SAVING' ? 'Registrando…' : 'Registrar adenda trazable'}
                        </button>
                      </form>
                    ) : <p className="mt-3 text-sm text-slate-400">Un episodio cerrado no admite nuevas adendas en este prototipo.</p>}
                    {addendumState === 'SAVED' && <p role="status" className="mt-3 text-sm text-emerald-300">Adenda registrada como nueva entrada; el original permanece intacto.</p>}
                    {addendumState === 'ERROR' && <p role="alert" className="mt-3 text-sm text-red-300">Adenda no registrada. Código mínimo: {addendumErrorCode}.</p>}
                  </div>
                )}

                {session.role === 'physician' && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="font-semibold">Respuesta facultativa sintética</h3>
                    <p className="text-xs text-slate-400 mt-1">Esta superficie documenta criterio escrito. No habilita prescripción electrónica ni acredita ejecución por Enfermería.</p>
                    {canRespond ? (
                      <form onSubmit={submitResponse} className="mt-3 space-y-3">
                        <textarea
                          value={responseText}
                          onChange={(event) => setResponseText(event.target.value)}
                          rows={4}
                          maxLength={4000}
                          placeholder="Respuesta sintética del facultativo"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
                        />
                        <button type="submit" disabled={responseState === 'SAVING'} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-40">
                          {responseState === 'SAVING' ? 'Registrando…' : 'Registrar respuesta escrita'}
                        </button>
                      </form>
                    ) : <p className="mt-3 text-sm text-slate-400">El episodio cerrado no admite nuevas respuestas.</p>}
                    {responseState === 'SAVED' && <p role="status" className="mt-3 text-sm text-emerald-300">Respuesta registrada en la autoridad sintética. RESPONDIDO/EMITIDA no acredita lectura ni ejecución.</p>}
                    {responseState === 'ERROR' && <p role="alert" className="mt-3 text-sm text-red-300">Respuesta no registrada. Código mínimo: {responseErrorCode}.</p>}
                  </div>
                )}

                {!metadataOnly && selected.status === 'RESPONDIDO' && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="font-semibold">Cierre documental trazable</h3>
                    <p className="text-xs text-slate-400 mt-1">Cerrar el episodio documenta el fin de este registro. No acredita ejecución de indicaciones, prescripción ni resultado clínico.</p>
                    {canClose && (
                      <form onSubmit={submitClosure} className="mt-3 space-y-3">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={closureOptions.followUpPending} onChange={(event) => updateClosureOption('followUpPending', event.target.checked)} />Existe seguimiento pendiente</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={closureOptions.acknowledgementRequired} onChange={(event) => updateClosureOption('acknowledgementRequired', event.target.checked)} />La última respuesta exige acuse/lectura antes de cierre</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={closureOptions.handoffRequired} onChange={(event) => updateClosureOption('handoffRequired', event.target.checked)} />Relevo requerido antes de cierre</label>
                        {closureOptions.handoffRequired && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={closureOptions.handoffAcknowledged} onChange={(event) => updateClosureOption('handoffAcknowledged', event.target.checked)} />Relevo confirmado de forma trazable</label>}
                        {closureOptions.acknowledgementRequired && latestResponse && <p className="text-xs text-slate-400">Última respuesta: {latestResponse.deliveryStatus || 'EMITIDA'}.</p>}
                        <button type="submit" disabled={closureState === 'SAVING'} className="rounded-lg border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-40">
                          {closureState === 'SAVING' ? 'Cerrando…' : 'Cerrar episodio autoritativo'}
                        </button>
                      </form>
                    )}
                    {closureState === 'SAVED' && <p role="status" className="mt-3 text-sm text-emerald-300">Episodio cerrado en la autoridad sintética con identidad y timestamp atribuidos.</p>}
                    {closureState === 'ERROR' && <p role="alert" className="mt-3 text-sm text-red-300">Cierre no aplicado. Código mínimo: {closureErrorCode}.</p>}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function InternalClinicalAuthority() {
  const { session, centralizedClinicalApiEnabled } = useInternalPrototypeAuth();
  if (!centralizedClinicalApiEnabled) return <InternalClinicalPrototype />;
  if (!session) return null;
  return <CentralClinicalView session={session} />;
}
