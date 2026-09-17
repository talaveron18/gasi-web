import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, LockKeyhole } from 'lucide-react';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
import { createInternalClinicalApi } from '@/lib/internalClinicalApi';
import { loadAuthoritativeEpisodes, selectAuthoritativeEpisodeById } from '@/lib/internalClinicalAuthority';

const REASONS=[['authority_request','Requerimiento de autoridad'],['inspection','Inspección / revisión autorizada'],['incident_review','Revisión de incidente']];

export default function InternalClinicalFocusedEpisode(){
 const {episodeId}=useParams(); const {session,centralValidationEnabled,isMaster}=useInternalPrototypeAuth();
 const api=useMemo(()=>session?.id?createInternalClinicalApi({actorId:session.id}):null,[session?.id]);
 const [state,setState]=useState('LOADING'),[errorCode,setErrorCode]=useState(null),[episode,setEpisode]=useState(null);
 const [privileged,setPrivileged]=useState(null),[reason,setReason]=useState('authority_request'),[reference,setReference]=useState(''),[accessBusy,setAccessBusy]=useState(false),[accessError,setAccessError]=useState('');
 const canPrivilegedRead=Boolean(isMaster||session?.delegatedPrivileges?.includes('clinical_record_privileged_read'));
 useEffect(()=>{let mounted=true;if(!api||!episodeId)return()=>{mounted=false};(async()=>{setState('LOADING');setErrorCode(null);const result=await loadAuthoritativeEpisodes(api);if(!mounted)return;if(!result.ok){setEpisode(null);setErrorCode(result.errorCode);setState('ERROR');return;}const selected=selectAuthoritativeEpisodeById({episodes:result.episodes,episodeId});if(!selected){setEpisode(null);setErrorCode('episode_not_visible');setState('ERROR');return;}setEpisode(selected);setState('READY');})();return()=>{mounted=false};},[api,episodeId]);
 if(!centralValidationEnabled)return <Navigate to="/interno/prototipo-clinico" replace/>; if(!session)return null;
 const metadataOnly=session.role==='admin';
 const openPrivileged=async(e)=>{e.preventDefault();if(!reference.trim())return;setAccessBusy(true);setAccessError('');try{setPrivileged(await api.privilegedRead(episodeId,{reason,reference:reference.trim()}));}catch(err){setPrivileged(null);setAccessError(err.code||'privileged_access_denied');}finally{setAccessBusy(false);}};
 const shown=privileged||episode;
 return <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="authoritative-focused-episode"><div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-cyan-300">Frente B · autoridad sintética</p><h1 className="mt-1 text-3xl font-bold">Caso autoritativo</h1></div><Link to="/interno/prototipo-clinico" className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Volver al listado</Link></div>
  {state==='LOADING'&&<div role="status" className="rounded-xl border border-slate-800 bg-slate-900 p-5">Cargando caso sintético…</div>}
  {state==='ERROR'&&<div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-red-100"><p className="font-semibold">Caso no disponible para esta identidad.</p><p className="mt-1 text-sm">La vista no usa fallback local ni datos en caché. Código mínimo: {errorCode}.</p></div>}
  {state==='READY'&&shown&&<>
   {privileged&&<div role="alert" className="mb-5 rounded-xl border-2 border-amber-400 bg-amber-400/10 p-4 text-amber-100"><div className="flex gap-2 font-bold"><LockKeyhole/>ACCESO CLÍNICO EXCEPCIONAL · SOLO LECTURA</div><p className="mt-2 text-sm">Este acceso ha requerido motivo y referencia y queda trazado. No habilita edición, corrección, respuesta ni cierre.</p></div>}
   <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap gap-2 text-sm mb-5"><span className="rounded-full bg-slate-800 px-3 py-1">{shown.status}</span><span className="rounded-full bg-slate-800 px-3 py-1">Nivel {shown.level}</span><span className="rounded-full bg-slate-800 px-3 py-1">{shown.center}</span></div>
    <dl className="grid sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Caso</dt><dd>{shown.id}</dd></div><div><dt className="text-slate-500">Creado</dt><dd>{shown.createdAt||'—'}</dd></div><div><dt className="text-slate-500">Creador</dt><dd>{shown.createdById||'—'}</dd></div><div><dt className="text-slate-500">Respondido</dt><dd>{shown.respondedAt||'—'}</dd></div><div><dt className="text-slate-500">Respondedor</dt><dd>{shown.respondedById||'—'}</dd></div><div><dt className="text-slate-500">Cerrado</dt><dd>{shown.closedAt||'—'}</dd></div><div><dt className="text-slate-500">Cerrado por</dt><dd>{shown.closedById||'—'}</dd></div></dl>
    {(!metadataOnly||privileged)&&<div className="mt-6 space-y-4 border-t border-slate-800 pt-5"><div><p className="text-xs uppercase tracking-wide text-slate-500">Referencia sintética</p><p>{shown.patientRef||'—'}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Situación sintética</p><p className="whitespace-pre-wrap">{shown.summary||'—'}</p></div></div>}
    {metadataOnly&&!privileged&&<p className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Administración / Coordinación recibe solo metadatos operativos; no se presenta narrativa clínica.</p>}
    {shown.level===1&&session.role!=='admin'&&!privileged&&<div className="mt-5 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"><strong>Nivel 1:</strong> realizar llamada telefónica directa al facultativo. La web no sustituye ni retrasa esa llamada.</div>}
   </section>
   {metadataOnly&&canPrivilegedRead&&!privileged&&<form onSubmit={openPrivileged} className="mt-5 rounded-xl border border-amber-400/30 bg-slate-900 p-5"><h2 className="font-bold flex gap-2"><AlertTriangle className="w-5"/>Acceso excepcional al contenido clínico</h2><p className="text-sm text-slate-400 mt-1">Úsalo únicamente cuando exista una causa concreta. El backend registra identidad, motivo y referencia.</p><label className="block mt-4 text-sm">Motivo<select value={reason} onChange={e=>setReason(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-950 border border-slate-700">{REASONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="block mt-3 text-sm">Referencia obligatoria<input required minLength={3} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} placeholder="EXP-DEMO-001" className="w-full mt-1 p-2 rounded bg-slate-950 border border-slate-700"/></label>{accessError&&<p role="alert" className="mt-3 text-red-300">Acceso rechazado: {accessError}</p>}<button disabled={accessBusy||reference.trim().length<3} className="mt-4 rounded bg-amber-300 px-4 py-2 font-bold text-slate-950">{accessBusy?'Registrando acceso…':'Abrir en solo lectura'}</button></form>}
  </>}
 </div></main>;
}
