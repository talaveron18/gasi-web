import React from 'react';
import { partitionAuthoritativeEpisodes } from '@/lib/internalClinicalAuthority';

function EpisodeButton({ episode, selectedId, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(episode.id)}
      className={`w-full text-left rounded-lg border p-3 ${episode.id === selectedId ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-800 bg-slate-950'}`}
    >
      <p className="font-semibold">{episode.id}</p>
      <p className="text-xs text-slate-400 mt-1">{episode.center} · N{episode.level} · {episode.status}</p>
    </button>
  );
}

export default function InternalClinicalEpisodeQueue({ episodes, selectedId, onSelect }) {
  const { pending, closed } = partitionAuthoritativeEpisodes(episodes);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4" data-testid="authoritative-episode-queue">
      <div>
        <h2 className="font-bold">Pendientes</h2>
        <p className="mt-1 text-xs text-slate-400">Casos ABIERTO o RESPONDIDO que siguen dentro del flujo activo.</p>
        <div className="mt-3 space-y-2">
          {pending.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-400">No hay casos pendientes.</p>
          ) : pending.map((episode) => (
            <EpisodeButton key={episode.id} episode={episode} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-5">
        <h2 className="font-bold">Histórico cerrado</h2>
        <p className="mt-1 text-xs text-slate-400">Casos CERRADO conservados para consulta trazable; no vuelven a la cola activa.</p>
        <div className="mt-3 space-y-2">
          {closed.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-400">No hay casos cerrados visibles.</p>
          ) : closed.map((episode) => (
            <EpisodeButton key={episode.id} episode={episode} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
