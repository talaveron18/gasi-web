import React,{useCallback,useEffect,useState} from 'react';
import {useAula} from './AulaAuthContext';
const button='rounded-lg bg-[#005EB8] px-4 py-2.5 font-semibold text-white disabled:opacity-50';
function ReviewCard({review,onReviewed}){
 const {request}=useAula();
 const [grades,setGrades]=useState(review.rubric.map(()=>review.min_per_criterion));
 const [feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async(decision)=>{
   setBusy(true);setError('');
   try{await request('/tutor/reviews/'+review.id,{method:'POST',body:{decision,grades,feedback}});await onReviewed();}
   catch(e){setError('No se pudo registrar la corrección: '+e.message);}finally{setBusy(false);}
 };
 return <article className="rounded-xl border border-slate-200 bg-white p-5" data-testid="aula-tutor-review">
   <h3 className="text-lg font-bold">{review.student_name} · {review.unit_title}</h3>
   <p className="mt-1 text-sm text-slate-600">{review.course_title} · Entrega: {new Date(review.submitted_at).toLocaleString('es-ES')}</p>
   <p className="my-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">{review.answer}</p>
   <h4 className="font-semibold">Evaluación según rúbrica</h4>
   <div className="mt-3 space-y-3">{review.rubric.map((criterion,i)=><label key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">{criterion}
     <select aria-label={'Puntuación: '+criterion} className="rounded-lg border border-slate-300 p-2" value={grades[i]} onChange={e=>setGrades(old=>old.map((n,j)=>i===j?Number(e.target.value):n))}>
       {[0,1,2,3,4].map(n=><option key={n} value={n}>{n} / 4</option>)}</select>
   </label>)}</div>
   <p className="mt-3 text-sm">Total: {grades.reduce((a,b)=>a+b,0)} / {grades.length*4}. Cada criterio debe alcanzar {review.min_per_criterion}/4.</p>
   <label className="mt-4 block text-sm font-semibold">Comentarios para el alumno<textarea rows={3} maxLength={5000} className="mt-2 w-full rounded-lg border p-3" value={feedback} onChange={e=>setFeedback(e.target.value)}/></label>
   {error&&<p role="alert" className="mt-3 text-rose-700">{error}</p>}
   <div className="mt-4 flex flex-wrap gap-3"><button className={button} disabled={busy||grades.some(n=>n<review.min_per_criterion)} onClick={()=>submit('approved')}>Aprobar práctica</button>
     <button className="rounded-lg border border-rose-400 px-4 py-2.5 font-semibold text-rose-800 disabled:opacity-50" disabled={busy||feedback.trim().length<5} onClick={()=>submit('rejected')}>Devolver para corregir</button></div>
 </article>;
}
export default function AulaTutor(){
 const {request}=useAula();
 const [reviews,setReviews]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
   setLoading(true);setError('');
   try{const response=await request('/tutor/reviews');setReviews(Array.isArray(response.reviews)?response.reviews:[]);}
   catch(e){setError('No se ha podido cargar la cola: '+e.message);}finally{setLoading(false);}
 },[request]);
 useEffect(()=>{refresh();},[refresh]);
 return <section className="space-y-4" data-testid="aula-tutor-panel">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Correcciones pendientes</h2>
     <p className="text-sm text-slate-600">Solo se muestran prácticas de cursos asignados a este tutor.</p></div>
     <button className="rounded-lg border border-slate-300 px-4 py-2" onClick={refresh}>Actualizar</button></div>
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
   {loading&&<p role="status">Cargando entregas…</p>}
   {!loading&&!error&&reviews.length===0&&<p className="rounded-lg border bg-white p-5">No hay prácticas pendientes de corrección.</p>}
   {reviews.map(r=><ReviewCard key={r.id} review={r} onReviewed={refresh}/>)}
 </section>;
}
