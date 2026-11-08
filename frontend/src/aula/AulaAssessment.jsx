import React,{useCallback,useEffect,useState} from 'react';
import {useAula} from './AulaAuthContext';

const button='rounded-lg bg-[#005EB8] px-4 py-2.5 font-semibold text-white disabled:opacity-40';
const card='rounded-xl border border-slate-200 bg-white p-5';
export default function AulaAssessment({courseId,unitId,onStatus}){
 const {request}=useAula();
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [answers,setAnswers]=useState({}),[review,setReview]=useState(null),[draft,setDraft]=useState('');
 const load=useCallback(async()=>{
   try{const value=await request('/courses/'+courseId+'/units/'+unitId+'/assessment');
     setData(value);onStatus({test_passed:value.test_passed,practice_approved:value.practice_approved});
   }catch(e){setError('No se puede cargar la evaluación: '+e.message);}
 },[courseId,unitId,request,onStatus]);
 useEffect(()=>{setData(null);setAnswers({});setReview(null);setDraft('');setError('');load();},[load]);
 const sendTest=async()=>{
   if(!data?.attempt_id||Object.keys(answers).length!==10)return;
   setBusy(true);setError('');
   try{
     const result=await request('/courses/'+courseId+'/units/'+unitId+'/assessment/test',{
       method:'POST',body:{attempt_id:data.attempt_id,answers}});
     setReview(result);setData(p=>({...p,test_passed:p.test_passed||result.passed,latest_test:result}));
     onStatus({test_passed:result.passed||data.test_passed,practice_approved:data.practice_approved});
   }catch(e){setError('No se han registrado las respuestas: '+e.message);}finally{setBusy(false);}
 };
 const sendPractice=async()=>{
   setBusy(true);setError('');
   try{await request('/courses/'+courseId+'/units/'+unitId+'/assessment/practice',{method:'POST',body:{answer:draft}});
     setDraft('');await load();
   }catch(e){setError('No se ha enviado la práctica: '+e.message);}finally{setBusy(false);}
 };
 if(!data)return <section className={card} role="status">{error||'Cargando actividades de evaluación…'}</section>;
 const practice=data.practice,submission=practice?.submission;
 return <section className="space-y-5" aria-label="Evaluación de la unidad" data-testid="aula-assessment">
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}
   {data.attempt_id&&Array.isArray(data.questions)&&data.questions.length===10&&<>
     <article className={card}><h3 className="text-xl font-bold">Test de conocimientos</h3>
       <p className="mt-2 text-sm text-slate-600">10 preguntas elegidas por el servidor de un banco de 15 · 3 opciones · mínimo 7 correctas.</p>
       <ol className="mt-5 space-y-5">{data.questions.map((q,i)=><li key={q.id} className="rounded-lg border p-3">
         <p className="font-semibold">{i+1}. {q.prompt}</p>
         <fieldset disabled={busy||!!review}><legend className="sr-only">Pregunta {i+1}</legend>{q.options.map((option,n)=><label key={n} className="mt-2 flex items-start gap-2 text-sm">
           <input type="radio" name={'aula-q-'+q.id} checked={answers[q.id]===n} onChange={()=>setAnswers(p=>({...p,[q.id]:n}))}/>{option}
         </label>)}</fieldset>
         {review?.review&&<p className="mt-2 text-sm font-semibold">{review.review.find(x=>x.id===q.id)?.correct?'Correcta':'Incorrecta'}.
           Solución: {q.options[review.review.find(x=>x.id===q.id)?.correct_index]}.</p>}
       </li>)}</ol>
       {review?<div className="mt-5"><p role="status" className="font-bold">{review.score}/10 · {review.passed?'Superado':'No superado'}</p>
         {!review.passed&&<button type="button" onClick={()=>{setAnswers({});setReview(null);load();}} className={button+' mt-3'}>Realizar otro intento</button>}
       </div>:<button type="button" disabled={busy||Object.keys(answers).length!==10} onClick={sendTest} className={button+' mt-5'}>Enviar test</button>}
     </article>
   </>}
   {data.test_passed&&<p role="status" className="rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-900">Test superado. Este requisito está cumplido.</p>}
   {data.latest_test&&!data.test_passed&&!review&&<p className="rounded-lg bg-amber-50 p-3 text-sm">Último intento: {data.latest_test.score}/10. Puedes volver a intentarlo.</p>}
   {practice&&<article className={card}><h3 className="text-xl font-bold">{practice.title}</h3>
     <p className="mt-2 whitespace-pre-wrap text-sm">{practice.prompt}</p>
     <h4 className="mt-4 font-semibold">Rúbrica de evaluación</h4>
     <ul className="mt-2 list-inside list-disc text-sm">{practice.rubric.map((item,i)=><li key={i}>{item} · mínimo {practice.min_per_criterion}/4</li>)}</ul>
     {submission?.status==='approved'?<p className="mt-4 font-semibold text-emerald-700">Práctica aprobada por el tutor.</p>:
     submission?.status==='pending'?<p className="mt-4 font-semibold text-amber-800">Práctica enviada · pendiente de evaluar por el tutor.</p>:<>
       {submission?.status==='rejected'&&<p className="mt-4 text-rose-800">Corrección solicitada: {submission.tutor_feedback}</p>}
       <label className="mt-4 block text-sm font-semibold">Desarrollo de la práctica (mínimo 30 caracteres)
         <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={6} maxLength={10000} className="mt-2 w-full rounded-lg border border-slate-300 p-3"/></label>
       <button className={button+' mt-3'} disabled={busy||draft.trim().length<30} onClick={sendPractice}>Entregar práctica</button>
     </>}
     {submission&&<details className="mt-4 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer font-semibold">Solución orientativa (disponible tras la entrega)</summary>
       <p className="mt-2 whitespace-pre-wrap text-sm">{practice.reference_solution}</p></details>}
   </article>}
   <button type="button" onClick={load} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Actualizar estado de las evaluaciones</button>
 </section>;
}
