import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
import { createInternalClinicalApi } from '@/lib/internalClinicalApi';
import { loadAuthoritativeEpisodes, selectAuthoritativeEpisodeById } from '@/lib/internalClinicalAuthority';

export default function InternalClinicalFocusedEpisode() {
  const { episodeId } = useParams();
  const { session, centralValidationEnabled } = useInternalPrototypeAuth();
  const api = useMemo(() => session?.id ? createInternalClinicalApi({ actorId: session.id }) : null, [session?.id]);
  const [state, setState] = useState('LOADING');
  const [errorCode, setErrorCode] = useState(null);
  const [episode, setEpisode] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!api || !episodeId) return () => { mounted = false; };
    (async () => {
      setState('LOADING');
      setErrorCode(null);
      const result = await loadAuthoritativeEpisodes(api);
      if (!mounted) return;
      if (!result.ok) {
        setEpisode(null);
        setErrorCode(result.errorCode);
        setState('ERROR');
        return;
      }
      const selected = selectAuthoritativeEpisodeById({ episodes: result.episodes, episodeId });
      if (!selected) {
        setEpisode(null);
        setErrorCode('episode_not_visible');
        setState('ERROR');
        return;
      }
      setEpisode(selected);
      setState('READY');
    })();
    return () => { mounted = false; };
  }, [api, episodeId]);

  if (!centralValidationEnabled) return <Navigate to="/interno/prototipo-clinico" replace />;
  if (!session) return null;

  const metadataOnly = session.role === 'admin';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="authoritative-focused-episode">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-cyan-300">Frente B · autoridad sintética</p>
            <h1 className="mt-1 text-3xl font-bold">Caso autoritativo</h1>
          </div>
          <Link to="/interno/prototipo-clinico" className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Volver al listado</Link>
        </div>

        {state === 'LOADING' && <div role="status" className="rounded-xl border border-slate-800 bg-slate-900 p-5">Cargando caso sintético…</div>}
        {state === 'ERROR' && (
          <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-red-100">
            <p className="font-semibold">Caso no disponible para esta identidad.</p>
            <p className="mt-1 text-sm">La vista no usa fallback local ni datos en caché. Código mínimo: {errorCode}.</p>
          </div>
        )}

        {state === 'READY' && episode && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap gap-2 text-sm mb-5">
              <span className="rounded-full bg-slate-800 px-3 py-1">{episode.status}</span>
              <span className="rounded-full bg-slate-800 px-3 py-1">Nivel {episode.level}</span>
              <span className="rounded-full bg-slate-800 px-3 py-1">{episode.center}</span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Caso</dt><dd>{episode.id}</dd></div>
              <div><dt className="text-slate-500">Creado</dt><dd>{episode.createdAt || '—'}</dd></div>
              <div><dt className="text-slate-500">Creador</dt><dd>{episode.createdById || '—'}</dd></div>
              <div><dt className="text-slate-500">Respondido</dt><dd>{episode.respondedAt || '—'}</dd></div>
              <div><dt className="text-slate-500">Respondedor</dt><dd>{episode.respondedById || '—'}</dd></div>
              <div><dt className="text-slate-500">Cerrado</dt><dd>{episode.closedAt || '—'}</dd></div>
              <div><dt className="text-slate-500">Cerrado por</dt><dd>{episode.closedById || '—'}</dd></div>
            </dl>

            {!metadataOnly && (
              <div className="mt-6 space-y-4 border-t border-slate-800 pt-5">
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Referencia sintética</p><p>{episode.patientRef || '—'}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Situación sintética</p><p className="whitespace-pre-wrap">{episode.summary || '—'}</p></div>
              </div>
            )}
            {metadataOnly && <p className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Administración / Coordinación recibe solo metadatos operativos; no se presenta narrativa clínica.</p>}

            {episode.level === 1 && session.role !== 'admin' && (
              <div className="mt-5 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
                <strong>Nivel 1:</strong> realizar llamada telefónica directa al facultativo. La web no sustituye ni retrasa esa llamada.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
