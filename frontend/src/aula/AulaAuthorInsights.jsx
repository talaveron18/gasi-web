import React,{useCallback,useEffect,useState} from 'react';

export default function AulaAuthorInsights({courseId,request}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{
   setLoading(true);setError('');
   try{setData(await request('/admin/courses/'+courseId+'/audit'));}
   catch(e){setError('No se pudo comprobar el curso: '+e.message);}finally{setLoading(false);}
 },[courseId,request]);
 useEffect(()=>{load();},[load]);
 return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" data-testid="aula-author-insights">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Mapa de resultados y chequeo del curso</h2>
     <p className="text-sm text-slate-600">Validación del contenido y tiempos de conexión desde PostgreSQL.</p></div>
     <button type="button" onClick={load} className="rounded-lg border border-slate-300 px-4 py-2">Actualizar análisis</button></div>
   {loading&&<p role="status">Analizando el curso…</p>}
   {error&&<p role="alert" className="text-rose-800">{error}</p>}
   {data&&<><p className={'rounded-lg p-3 font-semibold '+(data.ready?'bg-emerald-50 text-emerald-900':'bg-amber-50 text-amber-900')}>
     {data.ready?'Chequeo estructural sin errores bloqueantes':'Se han encontrado errores estructurales. Revísalos antes de activar.'}
   </p>
   <div className="space-y-2"><h3 className="font-bold">Comprobaciones</h3>
     {data.issues?.length===0&&<p className="text-sm">Sin advertencias.</p>}
     {data.issues?.map((issue,i)=><p key={i} className={'rounded-lg border p-3 text-sm '+(issue.level==='error'?'border-rose-200 text-rose-900':'border-amber-200 text-amber-900')}>
       {issue.level==='error'?'Error':'Aviso'}{issue.unit_no!==undefined?' · Unidad '+issue.unit_no:''}: {issue.message}</p>)}</div>
   <div><h3 className="font-bold">Competencias del curso</h3>
     <ul className="mt-2 list-inside list-disc text-sm">{data.course?.competencies?.map(c=><li key={c.id}>{c.id}: {c.text}</li>)}</ul>
   </div>
   <div className="overflow-x-auto"><h3 className="font-bold">Mapa de resultados de aprendizaje</h3>
     <table className="mt-3 w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Unidad</th><th className="p-2">Resultado</th><th className="p-2">H2 asociados</th></tr></thead>
       <tbody>{data.ra_map?.map((item,i)=><tr className="border-b" key={i}>
         <td className="p-2">{item.unit_no} · {item.unit_title}</td>
         <td className="p-2">{item.id}: {item.text}</td>
         <td className="p-2">{item.headings?.length?item.headings.join('; '):'Sin vincular'}</td>
       </tr>)}</tbody></table>
   </div>
   <div className="overflow-x-auto"><h3 className="font-bold">Análisis de tiempos y finalización</h3>
     <table className="mt-3 w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Unidad</th><th className="p-2">Alumnos que han accedido</th><th className="p-2">Tiempo medio</th><th className="p-2">Finalizaciones</th></tr></thead>
       <tbody>{data.metrics?.map((m,i)=><tr className="border-b" key={i}>
         <td className="p-2">{m.unit_no} · {m.title}</td><td className="p-2">{m.studied_by||0}</td>
         <td className="p-2">{Math.round(Number(m.avg_seconds||0)/60)} minutos</td><td className="p-2">{m.completed_by||0}</td>
       </tr>)}</tbody></table>
   </div></>}
 </section>;
}
