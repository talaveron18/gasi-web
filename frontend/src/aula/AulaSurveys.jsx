import React,{useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAula} from './AulaAuthContext';

const blue='rounded-lg bg-[#005EB8] px-4 py-2.5 font-semibold text-white disabled:opacity-40';
export default function AulaSurveys({courseId}){
 const {request}=useAula();
 const [surveys,setSurveys]=useState([]),[certificate,setCertificate]=useState(null),[responses,setResponses]=useState({}),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const base='/courses/'+courseId;
 const load=useCallback(async()=>{
   try{
     const [items,cert]=await Promise.all([request(base+'/surveys'),request(base+'/certificate')]);
     setSurveys(items.surveys||[]);setCertificate(cert.certificate);
   }catch(e){setError('No se pueden cargar las encuestas: '+e.message);}
 },[request,base]);
 useEffect(()=>{load();},[load]);
 const answer=(surveyId,key,value)=>setResponses(p=>({...p,[surveyId]:{...(p[surveyId]||{}),[String(key)]:value}}));
 const submit=async(survey)=>{
   setBusy(true);setError('');setNotice('');
   try{await request(base+'/surveys/'+survey.id,{method:'POST',body:{responses:responses[survey.id]||{}}});
     await load();setNotice('Encuesta registrada.');}
   catch(e){setError('No se ha podido registrar la encuesta: '+e.message);}finally{setBusy(false);}
 };
 const issue=async()=>{
   setBusy(true);setError('');setNotice('');
   try{const r=await request(base+'/certificate',{method:'POST',body:{}});
     setCertificate(r.certificate);setNotice('Certificado emitido y guardado en tu expediente.');}
   catch(e){setError('No se ha emitido el certificado: '+e.message);}finally{setBusy(false);}
 };
 return <section className="mx-auto max-w-7xl space-y-4 px-4 py-8 text-slate-900" data-testid="aula-surveys">
   <div><p className="text-sm font-semibold text-[#005EB8]">Evaluación de la experiencia</p>
     <h2 className="mt-1 text-2xl font-bold">Encuestas y certificado del curso</h2>
     <p className="mt-2 text-sm text-slate-600">La encuesta final se activa cuando se completan todas las unidades. El certificado solo se emite tras cumplir también los requisitos de evaluación.</p></div>
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-900">{error}</p>}
   {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
   {surveys.map(s=><article key={s.id} className="rounded-xl border border-slate-200 bg-white p-5">
     <h3 className="text-xl font-bold">{s.title}</h3><p className="mt-2 text-xs uppercase text-slate-600">{s.kind==='final'?'Encuesta final':'Seguimiento'} · {s.submitted?'Enviada':'Pendiente'}</p>
     {!s.submitted&&<form className="mt-4 space-y-5" onSubmit={e=>{e.preventDefault();submit(s);}}>
       {s.questions.map((q,i)=><fieldset key={q.id} className="rounded-lg border p-3">
         <legend className="font-semibold">{i+1}. {q.text}</legend>
         {q.type==='scale'&&<label className="mt-2 block text-sm">Puntuación de 1 a 5
           <select className="mt-2 w-full rounded-lg border p-3" required value={responses[s.id]?.[q.id]??''} onChange={e=>answer(s.id,q.id,Number(e.target.value))}>
             <option value="">Selecciona una puntuación</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>}
         {q.type==='choice'&&<div className="mt-2 space-y-2">{q.options.map((o,j)=><label className="flex items-start gap-2 text-sm" key={j}>
           <input type="radio" name={'survey-'+s.id+'-'+q.id} required checked={responses[s.id]?.[q.id]===j} onChange={()=>answer(s.id,q.id,j)}/>{o}</label>)}</div>}
         {q.type==='text'&&<label className="mt-2 block text-sm">Respuesta<textarea required minLength={3} maxLength={2000} rows={3}
           className="mt-2 w-full rounded-lg border p-3" value={responses[s.id]?.[q.id]??''} onChange={e=>answer(s.id,q.id,e.target.value)}/></label>}
       </fieldset>)}
       <button type="submit" className={blue} disabled={busy||Object.keys(responses[s.id]||{}).length!==s.questions.length}>Entregar encuesta</button>
     </form>}
   </article>)}
   <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
     <h3 className="text-xl font-bold">Certificado de finalización</h3>
     {certificate?<div className="mt-3"><p className="font-semibold text-emerald-800">Certificado emitido.</p>
       <Link to={'/aula/certificado/'+certificate.id} className="mt-3 inline-block text-[#005EB8] underline">Ver e imprimir certificado</Link></div>:
       <><p className="mt-2 text-sm">Se comprobarán automáticamente las unidades completadas, los tests, las prácticas obligatorias y la encuesta final.</p>
       <button className={blue+' mt-4'} disabled={busy} type="button" onClick={issue}>Solicitar certificado</button></>}
   </article>
 </section>;
}
