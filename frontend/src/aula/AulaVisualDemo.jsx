import React,{useEffect,useMemo,useState} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {AULA_PREVIEW_DEMO} from './AulaAuthContext';
import AulaReaderView from './AulaReaderView';

// Solo demostración local. Nunca persiste datos ni concede acceso al aula real.
const course={id:'visual-demo',title:'Primeros auxilios y RCP para equipos — DEMOSTRACIÓN',
 objective:'Practicar la navegación, los requisitos de evaluación y la revisión por un tutor con datos inventados.',
 duration_hours:20,access_days:90,max_units_per_day:2};
const samples=[
 {id:'welcome',unit_no:0,title:'Bienvenida y metodología',introduction:'Presentación, método de trabajo y resultados de aprendizaje.',requires_test:false,requires_practice:false,
 learning_outcomes:[{id:'RA0',text:'Identificar la metodología y la secuencia de aprendizaje.'}],
 content_blocks:[{type:'heading',level:1,text:'Bienvenida al curso'},{type:'text',text:'Esta simulación no utiliza cuentas, alumnos ni bases de datos reales. El curso de producción requiere autenticación privada.'},{type:'callout',style:'recuerda',text:'Debes completar cada unidad y sus pruebas obligatorias. Hay un límite diario de dos unidades nuevas.'},{type:'heading',level:2,text:'Metodología'},{type:'text',text:'Lee el contenido, revisa los resultados de aprendizaje y completa las actividades.'}]},
 {id:'first',unit_no:1,title:'Seguridad de la escena',introduction:'Identificación de riesgos y activación de ayuda.',requires_test:false,requires_practice:false,
 learning_outcomes:[{id:'RA1',text:'Reconocer riesgos antes de intervenir.'}],
 content_blocks:[{type:'heading',level:1,text:'Primera respuesta'},{type:'text',text:'Antes de intervenir, comprueba que el entorno sea seguro. En España, el número general de emergencias es el 112.'},{type:'heading',level:2,text:'Conducta segura'},{type:'callout',style:'importante',text:'Este contenido es demostrativo y no sustituye la formación práctica.'}]},
 {id:'assessment',unit_no:2,title:'RCP y DEA — evaluación',introduction:'Test de conocimientos y práctica obligatoria con corrección del tutor.',requires_test:true,requires_practice:true,
 learning_outcomes:[{id:'RA2',text:'Identificar la secuencia básica de actuación y realizar una actividad supervisada.'}],
 content_blocks:[{type:'heading',level:1,text:'Pruebas de evaluación'},{type:'text',text:'Responde 10 preguntas extraídas aleatoriamente de un banco de 15. Necesitas al menos 7 respuestas correctas. Después envía la práctica y solicita la corrección del tutor.'},{type:'callout',style:'ejemplo',text:'Hasta que el tutor la apruebe, la práctica figura como pendiente de evaluar y la unidad siguiente permanece bloqueada.'}]}
];
const questions=[
 ['Antes de prestar ayuda, ¿qué debes valorar?',['La seguridad de la escena','El número de compañeros presentes','La marca del botiquín'],0],
 ['En España, el teléfono general de emergencias es…',['091','112','061 exclusivamente'],1],
 ['Una persona inconsciente que no respira con normalidad requiere…',['Esperar sin intervenir','Dar de beber','Pedir ayuda e iniciar la actuación de RCP según formación'],2],
 ['¿Qué indica RCP?',['Reanimación cardiopulmonar','Registro clínico privado','Revisión de constantes periféricas'],0],
 ['¿Qué es un DEA?',['Un aparato para medir glucosa','Un desfibrilador externo automatizado','Un sistema de ventilación manual'],1],
 ['Ante un entorno peligroso, lo prioritario es…',['Acceder deprisa','Mover a todos sin valoración','No exponerse y solicitar recursos adecuados'],2],
 ['¿Qué debe hacerse mientras llega ayuda especializada?',['Seguir las instrucciones del operador de emergencias','Desconectar el teléfono','Abandonar siempre el lugar'],0],
 ['En un DEA, las instrucciones de voz sirven para…',['Reemplazar la valoración inicial','Guiar al interviniente','Calcular el peso'],1],
 ['Si otra persona trae el DEA, debemos…',['Desatender la seguridad','Suspender la ayuda sin razón','Integrarlo siguiendo sus instrucciones'],2],
 ['Para evitar riesgos en una descarga del DEA…',['Nadie debe tocar a la persona cuando el equipo lo indique','La persona debe permanecer sentada','Hay que retirar siempre el dispositivo'],0],
 ['¿Cuál es una conducta correcta al pedir ayuda?',['Hablar sin indicar ubicación','Comunicar la ubicación y describir la situación','Colgar inmediatamente'],1],
 ['La valoración inicial incluye…',['Solo la temperatura','Solo la edad','Respuesta y respiración normal'],2],
 ['¿Qué información es más útil al operador?',['Qué sucede y dónde','Cuánto cuesta el DEA','El nombre comercial del curso'],0],
 ['Durante la actividad práctica, ¿quién valida el desempeño?',['El alumno automáticamente','El tutor mediante una rúbrica','La página sin revisar'],1],
 ['Para desbloquear una unidad con práctica obligatoria…',['Basta con abrirla','Basta con entregar un texto vacío','La práctica debe estar aprobada por el tutor'],2]
].map((x,i)=>({id:i+1,text:x[0],options:x[1],correct:x[2]}));
const rubric=['Seguridad y autoprotección','Valoración inicial y solicitud de ayuda','Secuencia de actuación explicada','Comunicación y justificación de decisiones'];
const labels={student:'Alumno',author:'Autor',tutor:'Tutor',admin:'Administrador'};
const primary='rounded-lg bg-[#005EB8] px-4 py-2 font-semibold text-white disabled:opacity-40';
const box='rounded-xl border border-slate-200 bg-white p-5';
function randomTen(){
 const copy=[...questions];
 for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
 return copy.slice(0,10);
}
function RolePanel({role,submission,onReview,accounts,onAdd}){
 const [rubricGrades,setRubricGrades]=useState([3,3,3,3]);
 const [newName,setNewName]=useState(''),[newEmail,setNewEmail]=useState('');
 if(role==='author')return <section className="mx-auto max-w-6xl space-y-5 px-5 py-8" data-testid="aula-preview-author">
   <h2 className="text-2xl font-bold">Panel de autor · cursos y unidades</h2>
   <p className="text-sm text-slate-600">La edición avanzada, las competencias y el mapa de resultados de aprendizaje corresponden a F5. Este panel solo utiliza registros ficticios.</p>
   {[{title:course.title,status:'Activo',units:samples},{title:'Simulación de un curso en preparación',status:'Borrador',units:[samples[0],samples[1]]}].map(c=><article key={c.title} className={box}>
     <h3 className="text-lg font-bold">{c.title}</h3><p className="mt-1 text-sm text-[#005EB8]">Estado: {c.status}</p>
     <ol className="mt-3 list-inside list-decimal space-y-1">{c.units.map(u=><li key={u.id}>Unidad {u.unit_no}: {u.title} · {u.learning_outcomes.map(r=>r.id).join(', ')}{u.requires_test?' · Test obligatorio':''}{u.requires_practice?' · Práctica obligatoria':''}</li>)}</ol>
   </article>)}
 </section>;
 if(role==='tutor')return <section className="mx-auto max-w-6xl space-y-5 px-5 py-8" data-testid="aula-preview-tutor">
   <h2 className="text-2xl font-bold">Panel de tutor · cola de correcciones</h2>
   <p className="text-sm text-slate-600">Evaluación simulada con cuatro criterios; la aprobación desbloquea al alumno al volver a su perfil.</p>
   <div className={box}><h3 className="font-bold">Práctica obligatoria · RCP y DEA</h3>
     {!submission&&<p className="mt-3">Sin entregas: cambia a Alumno, supera el test y envía una práctica.</p>}
     {submission&&<><p className="mt-2 text-sm">Alumno ficticio · Estado: <strong>{submission.status==='pending'?'Pendiente de evaluar':submission.status==='approved'?'Aprobada':'Requiere correcciones'}</strong></p>
       <p className="my-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{submission.text}</p>
       {submission.status==='pending'&&<><h4 className="font-semibold">Rúbrica (0–4 por criterio)</h4>
         {rubric.map((r,i)=><label key={r} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">{r}
           <select aria-label={'Puntuación: '+r} value={rubricGrades[i]} onChange={e=>setRubricGrades(p=>p.map((v,j)=>j===i?Number(e.target.value):v))} className="rounded-lg border px-3 py-2">
             {[0,1,2,3,4].map(n=><option key={n} value={n}>{n} / 4</option>)}</select></label>)}
         <p className="mt-3 text-sm">Total: {rubricGrades.reduce((a,b)=>a+b,0)} / 16. Para aprobar, cada criterio debe alcanzar 2/4 como mínimo.</p>
         <div className="mt-3 flex gap-3"><button className={primary} disabled={rubricGrades.some(n=>n<2)} onClick={()=>onReview('approved',rubricGrades)}>Aprobar práctica</button>
         <button className="rounded-lg border border-rose-400 px-4 py-2 font-semibold text-rose-800" onClick={()=>onReview('rejected',rubricGrades)}>Devolver para corregir</button></div></>}
       {submission.status!=='pending'&&<p className="mt-3 text-sm">Puntuaciones registradas: {submission.grades.join(' · ')}</p>}
     </>}
   </div>
 </section>;
 return <section className="mx-auto max-w-6xl space-y-5 px-5 py-8" data-testid="aula-preview-admin">
   <h2 className="text-2xl font-bold">Administración · alta interna de usuarios</h2>
   <p className="text-sm text-slate-600">No existe registro público. Aquí solo se admiten direcciones ficticias terminadas en .invalid y no se crean credenciales reales.</p>
   <div className={box}><h3 className="font-bold">Cuentas de demostración</h3><ul className="mt-3 list-inside list-disc text-sm">{accounts.map(a=><li key={a.email}>{a.name} · {a.email} · {labels[a.role]}</li>)}</ul></div>
   <form className={box+' space-y-3'} onSubmit={e=>{e.preventDefault();if(!newName.trim()||!newEmail.endsWith('.invalid'))return;onAdd({name:newName,email:newEmail,role:'student'});setNewName('');setNewEmail('');}}>
     <h3 className="font-bold">Añadir alumno de prueba</h3><label className="block text-sm">Nombre<input required maxLength={70} value={newName} onChange={e=>setNewName(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
     <label className="block text-sm">Correo ficticio (.invalid)<input required type="email" pattern=".+\.invalid" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
     <button className={primary} type="submit">Crear usuario ficticio</button>
   </form>
 </section>;
}
function DemoAssessment({result,questionsShown,answers,onAnswer,onStart,onSubmit,practice,onPractice,onSend}){
 const [showSolution,setShowSolution]=useState(false);
 return <section className={box+' space-y-5'} data-testid="aula-preview-assessment">
   <div><h3 className="text-xl font-bold">Test: 10 preguntas aleatorias de un banco de 15</h3>
     <p className="mt-1 text-sm text-slate-600">Tres respuestas por pregunta · Aprobado con 7/10 · No se muestran las soluciones antes del envío.</p></div>
   {!questionsShown.length&&<button className={primary} onClick={onStart}>Iniciar test</button>}
   {questionsShown.length>0&&<><ol className="space-y-5">{questionsShown.map((q,i)=><li key={q.id} className="rounded-lg border p-3">
     <h4 className="font-semibold">{i+1}. {q.text}</h4>
     <fieldset disabled={!!result}><legend className="sr-only">Respuestas de la pregunta {i+1}</legend>
       {q.options.map((o,j)=><label className="mt-2 flex items-start gap-2 text-sm" key={j}><input type="radio" name={'demo-question-'+q.id} checked={answers[q.id]===j} onChange={()=>onAnswer(q.id,j)}/>{o}</label>)}
     </fieldset>{result&&<p className="mt-2 text-sm font-semibold">{answers[q.id]===q.correct?'Correcta':'Incorrecta'} · Solución: {q.options[q.correct]}</p>}</li>)}</ol>
     {result?<><p role="status" className="font-semibold">Resultado: {result.score}/10 · {result.passed?'Superado':'No superado'}</p><button className="rounded-lg border px-4 py-2" onClick={onStart}>Realizar otro intento</button></>:
       <button className={primary} disabled={Object.keys(answers).length!==10} onClick={onSubmit}>Enviar respuestas</button>}
   </>}
   <div className="border-t pt-5"><h3 className="text-xl font-bold">Práctica obligatoria</h3>
     <p className="mt-2 text-sm">Describe cómo organizarías la seguridad, la valoración inicial, la llamada de ayuda y la aplicación de las instrucciones del DEA en un caso simulado. Criterios: {rubric.join('; ')}.</p>
     {practice?.status==='approved'?<p className="mt-3 font-semibold text-emerald-700">Práctica aprobada por el tutor.</p>:
       practice?.status==='pending'?<p className="mt-3 font-semibold text-amber-800">Entrega registrada · pendiente de evaluar por el tutor.</p>:<>
       {practice?.status==='rejected'&&<p className="mt-2 text-rose-700">El tutor ha solicitado correcciones. Puedes enviar una nueva versión.</p>}
       <textarea aria-label="Desarrollo de la práctica" rows={5} minLength={30} value={practice?.draft||''} onChange={e=>onPractice(e.target.value)}
         className="mt-3 w-full rounded-lg border p-3" placeholder="Escribe al menos 30 caracteres…"/>
       <button className={primary} disabled={(practice?.draft||'').trim().length<30} onClick={onSend}>Enviar práctica al tutor</button></>}
     <button className="mt-3 block text-sm font-semibold text-[#005EB8] underline" onClick={()=>setShowSolution(p=>!p)} disabled={!practice||practice.status==='draft'}>
       {showSolution?'Ocultar':'Consultar'} solución orientativa tras la entrega
     </button>{showSolution&&<p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">Solución orientativa: proteger la escena, valorar consciencia y respiración, activar el 112, pedir un DEA y seguir las indicaciones del equipo y del operador según la formación recibida.</p>}
   </div>
 </section>;
}
export default function AulaVisualDemo(){
 const [role,setRole]=useState('student'),[completed,setCompleted]=useState([]),[selected,setSelected]=useState('welcome');
 const [visited,setVisited]=useState(['welcome']),[today,setToday]=useState(['welcome']),[day,setDay]=useState(1);
 const [seconds,setSeconds]=useState(0),[testQs,setTestQs]=useState([]),[answers,setAnswers]=useState({}),[result,setResult]=useState(null);
 const [practice,setPractice]=useState(null),[accounts,setAccounts]=useState([
  {name:'Autor de prueba',role:'author',email:'autor@example.invalid'},
  {name:'Tutor de prueba',role:'tutor',email:'tutor@example.invalid'},
  {name:'Alumno de prueba',role:'student',email:'alumno@example.invalid'},
  {name:'Administrador de prueba',role:'admin',email:'admin@example.invalid'}
 ]);
 useEffect(()=>{
   if(role!=='student')return undefined;
   const t=window.setInterval(()=>{if(document.visibilityState==='visible')setSeconds(n=>n+1);},1000);
   return()=>window.clearInterval(t);
 },[role]);
 const units=useMemo(()=>samples.map((u,i)=>{
   const previousOk=i===0||completed.includes(samples[i-1].id);
   const capped=previousOk&&!visited.includes(u.id)&&today.length>=course.max_units_per_day;
   const open=previousOk&&!capped;
   return {...u,completed:completed.includes(u.id),open,test_passed:u.requires_test?result?.passed===true:false,
    practice_approved:u.requires_practice?practice?.status==='approved':false,practice_status:practice?.status,
    viewed_seconds:visited.includes(u.id)?seconds:0,
    reason:!previousOk?'Completa primero la unidad anterior y sus evaluaciones.':capped?'Límite diario alcanzado. Pulsa «Simular día siguiente» para continuar.':null};
 }),[completed,visited,today,seconds,result,practice]);
 if(!AULA_PREVIEW_DEMO)return <Navigate to="/aula/acceso" replace/>;
 const current=units.find(u=>u.id===selected&&u.open);
 const open=id=>{const u=units.find(x=>x.id===id);if(!u?.open)return;
   setSelected(id);if(!visited.includes(id))setVisited(v=>[...v,id]);if(!visited.includes(id))setToday(v=>[...v,id]);
 };
 const complete=id=>{const u=units.find(x=>x.id===id);if(!u?.open||(u.requires_test&&!u.test_passed)||(u.requires_practice&&!u.practice_approved))return;
   const next=[...new Set([...completed,id])];setCompleted(next);
   const target=samples.find((x,i)=>i>samples.findIndex(k=>k.id===id)&&next.includes(samples[i-1]?.id)&&(!visited.includes(x.id)?today.length<course.max_units_per_day:true));
   if(target)open(target.id);
 };
 const reset=()=>{setCompleted([]);setSelected('welcome');setVisited(['welcome']);setToday(['welcome']);setDay(1);setSeconds(0);setTestQs([]);setAnswers({});setResult(null);setPractice(null);};
 const start=()=>{setTestQs(randomTen());setAnswers({});setResult(null);};
 const submit=()=>{if(testQs.length!==10||Object.keys(answers).length!==10)return;
   const score=testQs.filter(q=>answers[q.id]===q.correct).length;setResult({score,passed:score>=7});
 };
 const practiceChange=value=>setPractice(p=>({...p,draft:value,status:p?.status==='rejected'?'rejected':'draft'}));
 const sendPractice=()=>setPractice(p=>({text:p.draft, status:'pending'}));
 const assessment=current?.id==='assessment'?<DemoAssessment result={result} questionsShown={testQs} answers={answers} onAnswer={(id,v)=>setAnswers(p=>({...p,[id]:v}))}
   onStart={start} onSubmit={submit} practice={practice} onPractice={practiceChange} onSend={sendPractice}/>:null;
 return <div data-testid="aula-visual-preview" className="bg-slate-50 text-slate-900">
   <header className="border-b border-amber-200 bg-amber-50 px-5 py-4"><div className="mx-auto max-w-7xl">
     <p className="font-bold text-amber-950">Vista previa interactiva · datos totalmente ficticios, sin iniciar sesión</p>
     <p className="mt-1 text-sm text-amber-900">Los resultados y las cuentas se pierden al recargar la página. El acceso privado necesita PostgreSQL y las claves de Netlify.</p>
     <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold">Ver como
       <select aria-label="Perfil de la vista previa" value={role} onChange={e=>setRole(e.target.value)} className="ml-2 rounded-lg border border-amber-300 bg-white px-3 py-2">
         {Object.entries(labels).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
       <button onClick={reset} className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-semibold">Reiniciar simulación</button>
       <Link to="/aula/acceso" className={primary}>Probar acceso privado</Link>
     </div>
   </div></header>
   {role==='student'?<>
     <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 pt-5 text-sm">
       <strong>Día simulado {day} · {today.length}/{course.max_units_per_day} unidades nuevas</strong>
       <button type="button" className="rounded-lg border border-[#005EB8] bg-white px-3 py-2 font-semibold text-[#005EB8]" onClick={()=>{setToday([]);setDay(n=>n+1);}}>Simular día siguiente</button>
       <span>Al alcanzar el máximo diario, no pueden abrirse nuevas unidades hasta el día siguiente.</span>
     </div>
     <AulaReaderView course={course} units={units} selected={selected} unit={current} demo onOpen={open} onComplete={complete}
       assessmentPanel={assessment} metrics={{percent:Math.round(completed.length/samples.length*100),done:completed.length,total:samples.length,seconds,today:today.length,dailyMax:course.max_units_per_day}}/>
   </>:<RolePanel role={role} submission={practice?.text?practice:null}
      onReview={(status,grades)=>setPractice(p=>({...p,status,grades}))} accounts={accounts}
      onAdd={account=>setAccounts(p=>p.some(x=>x.email===account.email)?p:[...p,account])}/>}
 </div>;
}
