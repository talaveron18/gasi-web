import React,{useState}from'react';

const disciplineFor=role=>role==='psychologist'?'psychology':role==='physiotherapist'?'physiotherapy':'nursing';

export default function InternalClinicalEpisodeActions({episode,session,api,onUpdate,readOnly=false}){
 const[responseText,setResponseText]=useState('');
 const[addendumText,setAddendumText]=useState('');
 const[busy,setBusy]=useState('');
 const[message,setMessage]=useState('');
 if(!episode||!session||!api||readOnly)return null;
 const canWrite=session.role!=='admin'&&Array.isArray(session.centers)&&session.centers.includes(episode.center)&&disciplineFor(session.role)===episode.discipline;
 if(!canWrite||episode.status==='CERRADO')return null;
 const respond=async e=>{e.preventDefault();const text=responseText.trim();if(!text)return;setBusy('response');setMessage('');try{const updated=await api.respond(episode.id,text);onUpdate(updated);setResponseText('');setMessage('Respuesta facultativa registrada.');}catch(err){setMessage(`Respuesta rechazada: ${err.code||'error'}`);}finally{setBusy('');}};
 const addendum=async e=>{e.preventDefault();const text=addendumText.trim();if(!text)return;setBusy('addendum');setMessage('');try{const updated=await api.addAddendum(episode.id,text);onUpdate(updated);setAddendumText('');setMessage('Anotación registrada.');}catch(err){setMessage(`Anotación rechazada: ${err.code||'error'}`);}finally{setBusy('');}};
 return <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-5" aria-busy={Boolean(busy)}>
  <h2 className="font-bold">Actuación clínica</h2>
  <p className="mt-1 text-sm text-slate-400">Las acciones se registran con tu identidad y conservan la trazabilidad del episodio.</p>
  {session.role==='physician'&&<form onSubmit={respond} className="mt-4">
   <label className="block text-sm">Respuesta facultativa<textarea required minLength={2} value={responseText} onChange={e=>setResponseText(e.target.value)} className="mt-1 min-h-28 w-full rounded border border-slate-700 bg-slate-950 p-3"/></label>
   <button disabled={busy!==''||!responseText.trim()} className="mt-3 rounded bg-cyan-300 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">{busy==='response'?'Registrando…':'Emitir respuesta'}</button>
  </form>}
  <form onSubmit={addendum} className="mt-5 border-t border-slate-800 pt-4">
   <label className="block text-sm">Anotación / adenda<textarea required minLength={2} value={addendumText} onChange={e=>setAddendumText(e.target.value)} className="mt-1 min-h-24 w-full rounded border border-slate-700 bg-slate-950 p-3"/></label>
   <button disabled={busy!==''||!addendumText.trim()} className="mt-3 rounded border border-cyan-400 px-4 py-2 font-semibold disabled:opacity-50">{busy==='addendum'?'Registrando…':'Añadir anotación'}</button>
  </form>
  {message&&<p role="status" aria-live="polite" className="mt-3 text-sm text-cyan-100">{message}</p>}
 </section>;
}
