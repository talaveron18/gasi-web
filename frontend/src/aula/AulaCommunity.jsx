import React,{useCallback,useEffect,useState} from 'react';
import {useAula} from './AulaAuthContext';

const tabs=[['forum','Foros'],['tutorials','Tutorías'],['record','Expediente'],['ratings','Valorar unidades']];
const card='rounded-xl border border-slate-200 bg-white p-5';
const input='mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900';
const button='rounded-lg bg-[#005EB8] px-4 py-2.5 font-semibold text-white disabled:opacity-40';
const shortTime=s=>Math.floor(Number(s||0)/3600)+' h '+Math.floor((Number(s||0)%3600)/60)+' min';

export default function AulaCommunity({courseId,role,units=[]}){
 const {request}=useAula();
 const [tab,setTab]=useState('forum'),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [thread,setThread]=useState(null),[title,setTitle]=useState(''),[body,setBody]=useState('');
 const [question,setQuestion]=useState(''),[responses,setResponses]=useState({});
 const [learners,setLearners]=useState([]),[student,setStudent]=useState('');
 const [unitRating,setUnitRating]=useState(''),[rating,setRating]=useState(5),[comment,setComment]=useState('');
 const route='/courses/'+encodeURIComponent(courseId);
 const load=useCallback(async()=>{
   setError('');setBusy(true);
   try{
     if(tab==='record'&&role!=='student'){
       const users=await request(route+'/learners'),list=users.learners||[];
       setLearners(list);
       const active=list.some(l=>l.student_id===student)?student:list[0]?.student_id||'';
       if(!active){setData(null);return;}
       if(active!==student)setStudent(active);
       setData(await request(route+'/record?student_id='+encodeURIComponent(active)));
     }else setData(await request(route+'/'+tab));
   }catch(e){setError('No se ha podido cargar esta sección: '+e.message);}
   finally{setBusy(false);}
 },[request,route,tab,role,student]);
 useEffect(()=>{setThread(null);setNotice('');load();},[load]);
 const act=async(method,path,payload,done)=>{
   setBusy(true);setError('');setNotice('');
   try{await request(route+path,{method,body:payload});if(done)done();await load();setNotice('Cambios guardados.');}
   catch(e){setError('No se ha podido completar la operación: '+e.message);}
   finally{setBusy(false);}
 };
 const openThread=async id=>{
   setBusy(true);setError('');
   try{setThread(await request(route+'/forum/'+id));}
   catch(e){setError('No se pudo abrir el hilo: '+e.message);}finally{setBusy(false);}
 };
 const chosen=units.find(u=>u.id===unitRating)||units.find(u=>u.open)||units[0];
 return <section className="mx-auto max-w-7xl space-y-5 px-4 py-8 text-slate-900" data-testid="aula-community">
   <div><p className="text-sm font-semibold text-[#005EB8]">Participación y seguimiento</p><h2 className="mt-1 text-2xl font-bold">Aula y expediente</h2></div>
   <div role="tablist" aria-label="Servicios del curso" className="flex flex-wrap gap-2">{tabs.map(([id,name])=>
     <button key={id} type="button" role="tab" aria-selected={tab===id}
       className={(tab===id?'bg-[#005EB8] text-white':'bg-white text-slate-900 border border-slate-300')+' rounded-lg px-4 py-2 font-semibold'}
       onClick={()=>setTab(id)}>{name}</button>)}</div>
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
   {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
   {busy&&<p role="status" className="text-sm">Actualizando…</p>}
   {tab==='forum'&&<div className="grid gap-5 lg:grid-cols-2">
     <div className={card}><h3 className="text-xl font-bold">Hilos del curso</h3>
       {!data?.threads?.length&&<p className="mt-3 text-sm">Todavía no hay hilos.</p>}
       <ul className="mt-3 space-y-2">{data?.threads?.map(t=><li key={t.id}><button className="w-full rounded-lg border p-3 text-left hover:bg-blue-50"
         onClick={()=>openThread(t.id)}><strong className="block">{t.title}</strong>
         <span className="text-xs text-slate-600">{t.author_name} · {t.posts} mensajes {t.locked?'· Cerrado':''}</span></button></li>)}</ul>
       <form className="mt-5 space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();act('POST','/forum',{title,body},()=>{setTitle('');setBody('');});}}>
         <h4 className="font-bold">Abrir un hilo</h4><label className="block text-sm">Título<input required minLength={8} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className={input}/></label>
         <label className="block text-sm">Mensaje<textarea required minLength={2} maxLength={4000} rows={3} value={body} onChange={e=>setBody(e.target.value)} className={input}/></label>
         <button type="submit" disabled={busy} className={button}>Publicar hilo</button>
       </form>
     </div>
     <div className={card}>{thread?<><h3 className="text-xl font-bold">{thread.thread?.title}</h3>
       <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">{thread.posts?.map(p=><article key={p.id} className="rounded-lg border p-3">
         <p className="text-xs font-semibold text-[#005EB8]">{p.author_name} · {new Date(p.created_at).toLocaleString('es-ES')}</p><p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p></article>)}</div>
       {!thread.thread?.locked&&<form className="mt-4" onSubmit={e=>{e.preventDefault();act('POST','/forum/'+thread.thread.id,{body},()=>setBody(''));openThread(thread.thread.id);}}>
         <label className="block text-sm">Respuesta<textarea required rows={3} minLength={2} maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} className={input}/></label>
         <button type="submit" disabled={busy} className={button+' mt-3'}>Responder</button></form>}
       {thread.thread?.locked&&<p className="mt-3 text-sm text-slate-600">Este hilo está cerrado.</p>}
       {['admin','author','tutor'].includes(role)&&<button className="mt-3 rounded-lg border px-3 py-2 text-sm" disabled={busy}
         onClick={()=>{act('PATCH','/forum/'+thread.thread.id,{locked:!thread.thread.locked});openThread(thread.thread.id);}}>
         {thread.thread.locked?'Reabrir hilo':'Cerrar hilo'}</button>}
     </>:<p className="text-sm text-slate-600">Selecciona un hilo para leer los mensajes y participar.</p>}</div>
   </div>}
   {tab==='tutorials'&&<div className="grid gap-5 lg:grid-cols-2">
     {role==='student'&&<form className={card+' space-y-3'} onSubmit={e=>{e.preventDefault();act('POST','/tutorials',{question},()=>setQuestion(''));}}>
       <h3 className="text-xl font-bold">Consultar al tutor</h3><p className="text-sm">Estas consultas son privadas, no aparecen en el foro.</p>
       <label className="block text-sm">Tu consulta<textarea minLength={10} maxLength={4000} required rows={5} className={input} value={question} onChange={e=>setQuestion(e.target.value)}/></label>
       <button type="submit" disabled={busy} className={button}>Enviar consulta</button></form>}
     <div className={card}><h3 className="text-xl font-bold">Seguimiento de tutorías</h3>
       {!data?.tutorials?.length&&<p className="mt-3 text-sm">No hay consultas registradas.</p>}
       <div className="mt-3 space-y-4">{data?.tutorials?.map(t=><article key={t.id} className="rounded-lg border p-4">
         <p className="text-xs font-semibold text-[#005EB8]">{t.student_name} · {t.status==='open'?'Pendiente':t.status==='answered'?'Respondida':'Cerrada'}</p>
         <p className="mt-2 whitespace-pre-wrap text-sm">{t.question}</p>
         {t.answer&&<p className="mt-2 whitespace-pre-wrap rounded-lg bg-blue-50 p-3 text-sm"><strong>Respuesta:</strong> {t.answer}</p>}
         {role==='student'&&t.status==='answered'&&<button onClick={()=>act('PATCH','/tutorials/'+t.id,{})} className="mt-3 rounded-lg border px-3 py-2 text-sm">Cerrar consulta</button>}
         {['admin','tutor'].includes(role)&&t.status==='open'&&<form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();act('POST','/tutorials/'+t.id,{answer:responses[t.id]||''});}}>
           <label className="block text-sm">Respuesta del tutor<textarea className={input} rows={3} minLength={10} required value={responses[t.id]||''}
             onChange={e=>setResponses(p=>({...p,[t.id]:e.target.value}))}/></label>
           <button disabled={busy} type="submit" className={button}>Responder</button></form>}
       </article>)}</div>
     </div>
   </div>}
   {tab==='record'&&<div className={card}><h3 className="text-xl font-bold">Expediente académico</h3>
     {role!=='student'&&<label className="mt-3 block text-sm font-semibold">Alumno matriculado<select className={input} value={student} onChange={e=>setStudent(e.target.value)}>
       {learners.map(l=><option key={l.student_id} value={l.student_id}>{l.name}</option>)}</select></label>}
     {data?.units&&<><div className="mt-4 grid gap-3 sm:grid-cols-3"><p className="rounded-lg bg-blue-50 p-3"><strong className="block">Completado</strong>{data.completion_percent}%</p>
       <p className="rounded-lg bg-blue-50 p-3"><strong className="block">Tiempo de conexión</strong>{shortTime(data.viewed_seconds)}</p>
       <p className="rounded-lg bg-blue-50 p-3"><strong className="block">Plazo de acceso</strong>{new Date(data.deadline).toLocaleDateString('es-ES')}</p></div>
       <ol className="mt-4 space-y-2">{data.units.map(u=><li key={u.id} className="rounded-lg border p-3"><strong>Unidad {u.unit_no}: {u.title}</strong>
         <p className="text-sm">Estado: {u.completed_at?'Completada':'Pendiente'} · Conexión {shortTime(u.viewed_seconds)}
           {u.requires_test?' · Mejor test '+(u.best_score??'pendiente')+'/10':''}
           {u.requires_practice?' · Práctica '+(u.practice_status||'sin entregar'):''}</p></li>)}</ol></>}
   </div>}
   {tab==='ratings'&&<div className={card}><h3 className="text-xl font-bold">Valoración de unidades</h3>
     {role==='student'?<form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();act('POST','/ratings',{unit_id:chosen?.id,rating,comment},()=>setComment(''));}}>
       <label className="block text-sm">Unidad cursada<select className={input} value={unitRating||chosen?.id||''} onChange={e=>setUnitRating(e.target.value)}>
         {units.filter(u=>u.open||u.completed||u.viewed_seconds>0).map(u=><option key={u.id} value={u.id}>Unidad {u.unit_no}: {u.title}</option>)}</select></label>
       <label className="block text-sm">Valoración<select className={input} value={rating} onChange={e=>setRating(Number(e.target.value))}>
         {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} de 5</option>)}</select></label>
       <label className="block text-sm">Comentario (opcional)<textarea className={input} value={comment} rows={3} maxLength={2000} onChange={e=>setComment(e.target.value)}/></label>
       <button className={button} type="submit" disabled={busy||!chosen}>Guardar valoración</button></form>:
       <p className="mt-3 text-sm">Resultados agregados, sin mostrar los comentarios ni la identidad de los alumnos.</p>}
     <ul className="mt-4 space-y-2">{data?.ratings?.map((r,i)=><li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
       Unidad {units.find(u=>u.id===r.unit_id)?.unit_no??'—'} · {role==='student'?String(r.rating)+'/5 · '+(r.comment||'Sin comentario'):String(r.average_rating)+'/5 · '+r.ratings+' valoraciones'}
     </li>)}</ul>
   </div>}
 </section>;
}
