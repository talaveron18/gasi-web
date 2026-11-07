import React from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,Clock,LockKeyhole} from 'lucide-react';

const cls='rounded-xl border border-slate-200 bg-white p-4';
function Block({block}){
  if(block.type==='heading'){const T=['h1','h2','h3','h4'][Math.max(0,Math.min(3,(Number(block.level)||2)-1))];
    return <T className={block.level===1?'text-2xl font-bold text-slate-950':'mt-6 text-xl font-semibold text-slate-900'}>{block.text}</T>;}
  if(block.type==='callout')return <aside className="rounded-xl border-l-4 border-[#005EB8] bg-blue-50 p-4"><strong className="text-blue-900">{({recuerda:'Recuerda',importante:'Importante',ejemplo:'Ejemplo',resumen:'Resumen'})[block.style]||'Nota'}</strong><p className="mt-2 whitespace-pre-wrap text-slate-800">{block.text}</p></aside>;
  if(block.type==='image')return <figure><img src={block.src} alt={block.alt} loading="lazy" className="max-h-96 w-full rounded-xl object-contain"/>{block.text&&<figcaption className="mt-2 text-sm text-slate-600">{block.text}</figcaption>}</figure>;
  if(block.type==='video')return <figure><video controls preload="metadata" className="max-h-96 w-full rounded-xl" src={block.src}>Tu navegador no puede reproducir este vídeo.</video>{block.text&&<figcaption className="mt-2 text-sm text-slate-600">{block.text}</figcaption>}</figure>;
  return <p className="whitespace-pre-wrap leading-7 text-slate-800">{block.text}</p>;
}
export default function AulaReaderView({course,units=[],selected,unit,loading=false,error='',onOpen,onComplete,completing=false,demo=false}){
  const index=units.findIndex(x=>x.id===selected);
  const previous=units[index-1],next=units[index+1];
  const content=Array.isArray(unit?.content_blocks)?unit.content_blocks:[];
  const headings=content.filter(x=>x.type==='heading'&&x.level<=3);
  return <main className="min-h-[70vh] bg-slate-50 text-slate-900" data-testid="aula-reader">
    <div className="border-b border-slate-200 bg-white px-5 py-7">
      <div className="mx-auto max-w-7xl">
        {demo&&<p className="mb-2 inline-block rounded-lg bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950">Vista previa con datos totalmente ficticios — sin backend ni cuentas reales</p>}
        <p className="text-sm font-semibold uppercase tracking-wider text-[#005EB8]">Aula Virtual GASI</p>
        <h1 className="mt-2 text-3xl font-bold">{course.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{course.objective}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600"><span className="flex items-center gap-1"><Clock size={16}/> {course.duration_hours} horas</span><span>Acceso: {course.access_days||90} días</span>{course.max_units_per_day&&<span>Máximo {course.max_units_per_day} unidades nuevas/día</span>}</div>
      </div>
    </div>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 lg:grid-cols-[280px_minmax(0,1fr)]">
      <nav aria-label="Índice de unidades" className={cls+' self-start lg:sticky lg:top-4'}>
        <h2 className="mb-4 flex items-center gap-2 font-bold"><BookOpen size={18}/> Unidades del curso</h2>
        <ol className="space-y-2">{units.map(item=><li key={item.id}>
          <button type="button" disabled={!item.open} onClick={()=>onOpen(item.id)} aria-current={item.id===selected?'step':undefined}
            className={'flex w-full items-start gap-2 rounded-lg p-3 text-left text-sm '+(item.id===selected?'bg-blue-100 text-blue-950 ':item.open?'hover:bg-slate-100 ':'cursor-not-allowed bg-slate-50 text-slate-500 ')}>
            {item.completed?<CheckCircle2 size={18} className="shrink-0 text-emerald-700"/>:item.open?<BookOpen size={18} className="shrink-0 text-[#005EB8]"/>:<LockKeyhole size={18} className="shrink-0"/>}
            <span><strong className="block">Unidad {item.unit_no}</strong>{item.title}<span className="mt-1 block text-xs">{item.completed?'Completada':item.open?'Pendiente':'Bloqueada'}</span>{!item.open&&item.reason&&<span className="mt-1 block text-xs">{item.reason}</span>}</span>
          </button>
        </li>)}</ol>
      </nav>
      <section className="min-w-0 space-y-5" aria-labelledby="aula-selected-unit">
        {error&&<p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
        {loading&&<p role="status" className={cls}>Cargando el contenido autorizado…</p>}
        {unit&&!loading&&<>
          <article className={cls+' space-y-6'}>
            <div><p className="text-sm font-semibold text-[#005EB8]">Unidad {unit.unit_no}</p><h2 id="aula-selected-unit" className="mt-2 text-2xl font-bold">{unit.title}</h2><p className="mt-3 text-slate-600">{unit.introduction}</p></div>
            {headings.length>0&&<aside className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-bold">Índice de contenidos</h3><ul className="mt-2 space-y-1 text-sm text-slate-700">{headings.map((h,i)=><li key={i} className={h.level===3?'ml-4':''}>{h.text}</li>)}</ul></aside>}
            {content.map((block,i)=><Block block={block} key={i}/>)}
            {unit.learning_outcomes?.length>0&&<section className="rounded-xl bg-emerald-50 p-4"><h3 className="font-bold text-emerald-950">Resultados de aprendizaje</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-emerald-950">{unit.learning_outcomes.map(o=><li key={o.id}>{o.text}</li>)}</ul></section>}
            {(unit.requires_test||unit.requires_practice)&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Para completar esta unidad será necesario {unit.requires_test?'superar el test':''}{unit.requires_test&&unit.requires_practice?' y ':''}{unit.requires_practice?'obtener la evaluación de la práctica obligatoria':''}. Estas evaluaciones se incorporarán en F3; el sistema no permite saltárselas.
            </p>}
          </article>
          <div className="flex flex-wrap justify-between gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold disabled:opacity-40" disabled={!previous?.open} onClick={()=>previous&&onOpen(previous.id)}><ArrowLeft size={16}/> Anterior</button>
            {!units[index]?.completed&&<button type="button" data-testid="aula-complete-unit" disabled={completing||unit.requires_test||unit.requires_practice} onClick={()=>onComplete(unit.id)} className="rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white disabled:opacity-50">{completing?'Guardando…':'Marcar como completada'}</button>}
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold disabled:opacity-40" disabled={!next?.open} onClick={()=>next&&onOpen(next.id)}>Siguiente <ArrowRight size={16}/></button>
          </div>
        </>}
        {!unit&&!loading&&<p className={cls}>Selecciona una unidad disponible en el índice. Las unidades bloqueadas se habilitan según tu progreso y las evaluaciones exigidas.</p>}
      </section>
    </div>
  </main>;
}
