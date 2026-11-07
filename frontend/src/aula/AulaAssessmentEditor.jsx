import React,{useCallback,useEffect,useState} from 'react';
const input='mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const startQuestions=()=>Array.from({length:15},(_,i)=>({prompt:'',options:['','',''],correct_index:0,explanation:''}));
const startPractice=()=>({title:'Práctica obligatoria',prompt:'',reference_solution:'',rubric:['Seguridad de la escena','Valoración inicial','Activación de ayuda','Secuencia y comunicación'],min_per_criterion:2});
export default function AulaAssessmentEditor({courseId,unitId,requiresTest,requiresPractice,request}){
 const [questions,setQuestions]=useState(startQuestions),[practice,setPractice]=useState(startPractice);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{
   setLoading(true);
   try{const data=await request('/admin/courses/'+courseId+'/units/'+unitId+'/assessment');
     if(data.questions?.length===15)setQuestions(data.questions);
     if(data.practice)setPractice(data.practice);
   }catch(e){setError('Error al leer la evaluación: '+e.message);}finally{setLoading(false);}
 },[courseId,unitId,request]);
 useEffect(()=>{refresh();},[refresh]);
 const changeQuestion=(i,update)=>setQuestions(prev=>prev.map((q,n)=>i===n?{...q,...update}:q));
 const save=async()=>{
   setBusy(true);setError('');setNotice('');
   try{await request('/admin/courses/'+courseId+'/units/'+unitId+'/assessment',{method:'PUT',
     body:{questions:requiresTest?questions:[],practice:requiresPractice?practice:null}});
     setNotice('Evaluaciones guardadas. La publicación validará el banco y la rúbrica.');
   }catch(e){setError('No se pudo guardar: '+e.message);}finally{setBusy(false);}
 };
 if(!requiresTest&&!requiresPractice)return null;
 return <section className="mt-6 space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4" data-testid="aula-assessment-editor">
   <h3 className="text-xl font-bold">F3 · Configuración de pruebas de evaluación</h3>
   <p className="text-sm">Edita las actividades después de guardar los requisitos de la unidad. El sistema valida 15 preguntas de tres opciones y una rúbrica de al menos cuatro criterios.</p>
   {loading&&<p>Cargando evaluación…</p>}
   {error&&<p role="alert" className="text-rose-700">{error}</p>}
   {notice&&<p role="status" className="text-emerald-700">{notice}</p>}
   {requiresTest&&<details className="rounded-lg bg-white p-4" open><summary className="font-bold">Banco de 15 preguntas · se seleccionan 10 por intento</summary>
     <div className="mt-4 space-y-4">{questions.map((q,i)=><fieldset key={i} className="rounded-lg border p-3">
       <legend className="font-semibold">Pregunta {i+1}</legend>
       <label className="block text-sm">Enunciado<input className={input} maxLength={2000} value={q.prompt} onChange={e=>changeQuestion(i,{prompt:e.target.value})}/></label>
       <div className="mt-2 grid gap-2 md:grid-cols-3">{q.options.map((o,j)=><label key={j} className="text-sm">Opción {j+1}
         <input className={input} maxLength={500} value={o} onChange={e=>changeQuestion(i,{options:q.options.map((val,n)=>n===j?e.target.value:val)})}/></label>)}</div>
       <label className="mt-2 block text-sm">Respuesta correcta<select className={input} value={q.correct_index} onChange={e=>changeQuestion(i,{correct_index:Number(e.target.value)})}>
         {[0,1,2].map(n=><option key={n} value={n}>Opción {n+1}</option>)}</select></label>
       <label className="mt-2 block text-sm">Explicación tras el envío<input className={input} value={q.explanation||''} onChange={e=>changeQuestion(i,{explanation:e.target.value})}/></label>
     </fieldset>)}</div>
   </details>}
   {requiresPractice&&<details open className="rounded-lg bg-white p-4"><summary className="font-bold">Práctica y rúbrica de corrección</summary>
     <div className="mt-4 space-y-3"><label className="block text-sm">Título<input className={input} value={practice.title} onChange={e=>setPractice(p=>({...p,title:e.target.value}))}/></label>
     <label className="block text-sm">Enunciado<textarea className={input} rows={4} value={practice.prompt} onChange={e=>setPractice(p=>({...p,prompt:e.target.value}))}/></label>
     <label className="block text-sm">Solución orientativa (visible tras entregar)<textarea className={input} rows={4} value={practice.reference_solution} onChange={e=>setPractice(p=>({...p,reference_solution:e.target.value}))}/></label>
     {practice.rubric.map((r,i)=><label key={i} className="block text-sm">Criterio {i+1}<input className={input} value={r} onChange={e=>setPractice(p=>({...p,rubric:p.rubric.map((v,j)=>i===j?e.target.value:v)}))}/></label>)}
     <label className="block text-sm">Mínimo por criterio (de 4)<select className={input} value={practice.min_per_criterion} onChange={e=>setPractice(p=>({...p,min_per_criterion:Number(e.target.value)}))}>
       {[1,2,3,4].map(n=><option key={n} value={n}>{n} / 4</option>)}</select></label></div>
   </details>}
   <button disabled={busy||loading} type="button" onClick={save} className="rounded-lg bg-[#005EB8] px-4 py-2.5 font-semibold text-white disabled:opacity-50">Guardar evaluación</button>
 </section>;
}
