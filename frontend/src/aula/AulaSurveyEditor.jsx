import React,{useCallback,useEffect,useState} from 'react';
const cls='mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const main='rounded-lg bg-[#005EB8] px-4 py-2 font-semibold text-white disabled:opacity-50';
const initial=()=>({kind:'final',title:'Encuesta de finalización',unit_id:'',
  questions:[{id:1,type:'scale',text:'Valora el curso de 1 a 5'},
  {id:2,type:'text',text:'¿Qué mejorarías de la formación?'}]});
export default function AulaSurveyEditor({courseId,status,units,request}){
 const [surveys,setSurveys]=useState([]),[draft,setDraft]=useState(initial),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);
   try{const r=await request('/admin/courses/'+courseId+'/surveys');setSurveys(r.surveys||[]);}
   catch(e){setError('No se pueden cargar las encuestas: '+e.message);}finally{setLoading(false);}
 },[courseId,request]);
 useEffect(()=>{refresh();},[refresh]);
 const change=(i,fields)=>setDraft(p=>({...p,questions:p.questions.map((q,n)=>n===i?{...q,...fields}:q)}));
 const save=async()=>{
   setSaving(true);setError('');setNotice('');
   try{await request('/admin/courses/'+courseId+'/surveys',{method:'POST',body:{...draft,unit_id:draft.kind==='followup'&&draft.unit_id?draft.unit_id:null}});
     setDraft(initial());await refresh();setNotice('Encuesta creada en este curso.');}
   catch(e){setError('No se pudo crear la encuesta: '+e.message);}finally{setSaving(false);}
 };
 const remove=async(id)=>{
   setSaving(true);setError('');setNotice('');
   try{await request('/admin/courses/'+courseId+'/surveys/'+id,{method:'DELETE',body:{}});await refresh();}
   catch(e){setError('No se pudo eliminar la encuesta: '+e.message);}finally{setSaving(false);}
 };
 return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" data-testid="aula-survey-editor">
   <h3 className="text-xl font-bold">Encuestas de seguimiento y finalización</h3>
   <p className="text-sm text-slate-600">El alumno debe completar la encuesta final después de todas las unidades para poder obtener el certificado.</p>
   {error&&<p role="alert" className="text-rose-700">{error}</p>}{notice&&<p role="status" className="text-emerald-700">{notice}</p>}
   {loading&&<p role="status">Cargando encuestas…</p>}
   {surveys.map(s=><article key={s.id} className="rounded-lg border p-3"><strong>{s.title}</strong>
     <p className="text-sm text-slate-600">{s.kind==='final'?'Finalización':'Seguimiento'} · {s.questions?.length} preguntas · {s.responses||0} respuestas</p>
     {status==='draft'&&<button className="mt-2 text-sm font-semibold text-rose-700 underline" onClick={()=>remove(s.id)} disabled={saving}>Eliminar encuesta</button>}
   </article>)}
   {(status==='draft'||status==='active'&&!surveys.some(s=>s.kind==='final'))&&<div className="space-y-3 rounded-lg bg-slate-50 p-4">
     <h4 className="font-bold">{status==='active'?'Añadir encuesta final pendiente de configurar':'Nueva encuesta'}</h4>
     {status==='active'&&<p className="text-sm text-amber-800">El curso ya está activo: únicamente puedes añadir su encuesta final, sin modificar las unidades.</p>}
     {status==='draft'&&<label className="block text-sm">Tipo<select className={cls} value={draft.kind} onChange={e=>setDraft(p=>({...p,kind:e.target.value}))}>
       <option value="final">Finalización</option><option value="followup">Seguimiento</option></select></label>}
     <label className="block text-sm">Título<input className={cls} value={draft.title} maxLength={180} onChange={e=>setDraft(p=>({...p,title:e.target.value}))}/></label>
     {draft.kind==='followup'&&<label className="block text-sm">Unidad relacionada (opcional)<select className={cls} value={draft.unit_id} onChange={e=>setDraft(p=>({...p,unit_id:e.target.value}))}>
       <option value="">Todo el curso</option>{units.map(u=><option key={u.id} value={u.id}>Unidad {u.unit_no}: {u.title}</option>)}</select></label>}
     {draft.questions.map((q,i)=><fieldset key={i} className="rounded-lg border bg-white p-3">
       <legend className="font-semibold">Pregunta {i+1}</legend>
       <label className="block text-sm">Enunciado<input className={cls} value={q.text} onChange={e=>change(i,{text:e.target.value})}/></label>
       <label className="mt-2 block text-sm">Tipo<select className={cls} value={q.type} onChange={e=>change(i,{type:e.target.value,options:e.target.value==='choice'?['Opción A','Opción B']:undefined})}>
         <option value="scale">Escala de 1 a 5</option><option value="text">Texto libre</option><option value="choice">Elección múltiple</option></select></label>
       {q.type==='choice'&&<div className="mt-2 space-y-2">{(q.options||[]).map((option,j)=><label className="block text-sm" key={j}>Opción {j+1}
         <input className={cls} value={option} onChange={e=>change(i,{options:q.options.map((o,n)=>n===j?e.target.value:o)})}/></label>)}
         <button className="text-sm underline" disabled={q.options.length>=6} onClick={()=>change(i,{options:[...q.options,'Opción '+(q.options.length+1)]})}>Añadir opción</button></div>}
       <button className="mt-3 text-sm font-semibold text-rose-700 underline" disabled={draft.questions.length<=1} onClick={()=>setDraft(p=>({...p,questions:p.questions.filter((_,n)=>n!==i).map((q,n)=>({...q,id:n+1}))}))}>Eliminar pregunta</button>
     </fieldset>)}
     <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={draft.questions.length>=20}
       onClick={()=>setDraft(p=>({...p,questions:[...p.questions,{id:p.questions.length+1,type:'scale',text:''}]}))}>Añadir pregunta</button>
       <button type="button" className={main} disabled={saving||loading} onClick={save}>Guardar encuesta</button></div>
   </div>}
 </section>;
}
