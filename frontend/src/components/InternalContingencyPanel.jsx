import React from 'react';
import { AlertTriangle, Phone, ExternalLink, RefreshCw } from 'lucide-react';

function Action({ channel }) {
  if (channel.channel_type === 'PHONE') {
    return <a href={`tel:${channel.target}`} className="inline-flex items-center gap-2 rounded-lg border border-amber-300/50 px-3 py-2 text-sm font-semibold text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><Phone className="h-4 w-4" aria-hidden="true" />Llamar al canal alternativo</a>;
  }
  if (channel.channel_type === 'URL') {
    return <a href={channel.target} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-amber-300/50 px-3 py-2 text-sm font-semibold text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><ExternalLink className="h-4 w-4" aria-hidden="true" />Abrir canal alternativo</a>;
  }
  return <p className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><span className="text-slate-400">Referencia alternativa:</span> <strong>{channel.target}</strong></p>;
}

export default function InternalContingencyPanel({ channels = [], onRetry, retrying = false }) {
  return (
    <section className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4" aria-label="Contingencia del canal asistencial" data-testid="clinical-contingency-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-amber-100"><AlertTriangle className="h-5 w-5" aria-hidden="true" />Modo contingencia</h3>
          <p className="mt-1 text-sm text-amber-50/90">La autoridad clínica no está disponible. No se muestran ni almacenan copias locales de episodios.</p>
        </div>
        <button type="button" onClick={onRetry} disabled={retrying} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />{retrying ? 'Reintentando…' : 'Reintentar conexión'}
        </button>
      </div>
      {channels.length ? (
        <div className="mt-4 space-y-3" role="list" aria-label="Canales alternativos configurados">
          {channels.map(channel => (
            <article key={`${channel.tenant_id}:${channel.center}`} role="listitem" className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{channel.center}</p>
              <p className="mt-1 font-semibold">{channel.label}</p>
              <div className="mt-3"><Action channel={channel} /></div>
            </article>
          ))}
        </div>
      ) : (
        <p role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">No hay un canal alternativo configurado para los centros de esta sesión. La continuidad queda bloqueada hasta disponer de un canal autorizado.</p>
      )}
      <p className="mt-4 text-xs text-slate-400">El canal alternativo es operativo y no transporta contenido clínico desde esta pantalla.</p>
    </section>
  );
}
