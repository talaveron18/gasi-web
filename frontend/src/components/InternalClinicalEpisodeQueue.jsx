import React from 'react';
import { partitionAuthoritativeEpisodes } from '../lib/internalClinicalAuthority';

function EpisodeButton({ episode, selectedId, onSelect }) {
  const selected = episode.id === selectedId;
  return (
    <button
      type="button"
      onClick={() => onSelect(episode.id)}
      aria-pressed={selected}
      aria-label={`Episodio ${episode.id}, centro ${episode.center}, prioridad N${episode.level}, estado ${episode.status}`}
      className={`w-full rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${selected ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-800 bg-slate-950'}`}
    >
      <p className="font-semibold">{episode.id}</p>
      <p className="mt-1 text-xs text-slate-400">{episode.center} · N{episode.level} · {episode.status}</p>
    </button>
  );
}

function EpisodeList({ label, episodes, selectedId, onSelect, emptyText }) {
  if (episodes.length === 0) {
    return <p role="status" className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="space-y-2" role="list" aria-label={label}>
      {episodes.map((episode) => (
        <div role="listitem" key={episode.id}>
          <EpisodeButton episode={episode} selectedId={selectedId} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

export default function InternalClinicalEpisodeQueue({ episodes, selectedId, onSelect }) {
  const { pending, closed } = partitionAuthoritativeEpisodes(episodes);

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
      data-testid="authoritative-episode-queue"
      aria-label="Cola de episodios clínicos"
    >
      <div>
        <h2 className="font-bold">Pendientes</h2>
        <p className="mt-1 text-xs text-slate-400">Casos ABIERTO o RESPONDIDO que siguen dentro del flujo activo.</p>
        <div className="mt-3">
          <EpisodeList
            label="Episodios pendientes"
            episodes={pending}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyText="No hay casos pendientes."
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-5">
        <h2 className="font-bold">Histórico cerrado</h2>
        <p className="mt-1 text-xs text-slate-400">Casos CERRADO conservados para consulta trazable; no vuelven a la cola activa.</p>
        <div className="mt-3">
          <EpisodeList
            label="Histórico de episodios cerrados"
            episodes={closed}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyText="No hay casos cerrados visibles."
          />
        </div>
      </div>
    </section>
  );
}
