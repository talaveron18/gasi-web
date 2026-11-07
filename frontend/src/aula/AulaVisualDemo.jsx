import React,{useState} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {AULA_PREVIEW_DEMO} from './AulaAuthContext';
import AulaReaderView from './AulaReaderView';

// A deliberately isolated, read-only visual review surface. No login,
// database, uploaded content, personal data or stored student activity.
const course={
 id:'visual-demo',title:'Primeros auxilios y RCP para equipos — DEMOSTRACIÓN',
 objective:'Conocer la estructura y navegación de un curso secuencial. Todo el contenido es ficticio.',
 duration_hours:20,access_days:90,max_units_per_day:2
};
const samples=[
 {id:'welcome',unit_no:0,title:'Bienvenida y metodología',introduction:'Presentación del curso y cómo utilizar el aula.',requires_test:false,requires_practice:false,
  learning_outcomes:[{id:'RA0',text:'Reconocer el sistema de seguimiento y el funcionamiento del curso.'}],
  content_blocks:[{type:'heading',level:1,text:'Bienvenida al curso'},{type:'text',text:'Esta es una demostración visual. Los accesos reales estarán protegidos y el progreso se guardará en PostgreSQL.'},{type:'callout',style:'recuerda',text:'Las unidades siguientes permanecen bloqueadas hasta completar los requisitos anteriores.'},{type:'heading',level:2,text:'Metodología'},{type:'text',text:'Consulta el índice a la izquierda, completa cada unidad y utiliza los botones Anterior y Siguiente.'}]},
 {id:'first',unit_no:1,title:'Identificación de riesgos',introduction:'Evaluación inicial y activación de ayuda.',requires_test:false,requires_practice:false,
  learning_outcomes:[{id:'RA1',text:'Reconocer riesgos y solicitar ayuda de manera adecuada.'}],
  content_blocks:[{type:'heading',level:1,text:'Primera respuesta'},{type:'text',text:'Antes de intervenir es necesario valorar la seguridad del entorno. Para emergencias en España se utiliza el 112.'},{type:'callout',style:'importante',text:'Esta pantalla es una muestra funcional de navegación, no un curso acreditado ni un procedimiento de actuación clínica.'}]},
 {id:'assessment',unit_no:2,title:'RCP y DEA — evaluación',introduction:'Actividades evaluables previstas para la fase 3.',requires_test:true,requires_practice:true,
  learning_outcomes:[{id:'RA2',text:'Describir las fases y objetivos de una práctica formativa supervisada.'}],
  content_blocks:[{type:'heading',level:1,text:'Evaluación de conocimientos'},{type:'text',text:'En F3 se incorporarán preguntas aleatorias, intentos, prácticas obligatorias y corrección del tutor.'},{type:'callout',style:'ejemplo',text:'Una práctica obligatoria no se considerará superada hasta que exista una evaluación del tutor.'}]}
];
const label={student:'Alumno',author:'Autor',tutor:'Tutor',admin:'Administrador'};
export default function AulaVisualDemo(){
 const[role,setRole]=useState('student'),[completed,setCompleted]=useState([]),[selected,setSelected]=useState('welcome');
 if(!AULA_PREVIEW_DEMO)return <Navigate to="/aula/acceso" replace/>;
 const units=samples.map((u,i)=>({
   ...u,completed:completed.includes(u.id),
   open:role!=='student'||i===0||completed.includes(samples[i-1].id),
   reason:i===0||role!=='student'||completed.includes(samples[i-1].id)?null:'Completa la unidad anterior para desbloquear este contenido.'
 }));
 const unit=units.find(u=>u.id===selected&&u.open)||null;
 const open=id=>{if(units.some(u=>u.id===id&&u.open))setSelected(id);};
 const complete=id=>{const item=units.find(u=>u.id===id);if(!item?.open||item.requires_test||item.requires_practice)return;
   const nextCompleted=[...new Set([...completed,id])];setCompleted(nextCompleted);
   const next=samples.find((u,i)=>i>samples.findIndex(v=>v.id===id)&&(i===0||nextCompleted.includes(samples[i-1].id)));
   if(next)setSelected(next.id);
 };
 return <div data-testid="aula-visual-preview">
   <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
     <div className="mx-auto max-w-7xl">
       <p className="font-bold text-amber-950">Vista previa visual — datos completamente ficticios, sin iniciar sesión</p>
       <p className="mt-1 text-sm text-amber-900">Para comprobar el inicio de sesión real se necesitan la base de datos privada y las credenciales sintéticas configuradas como secretos de Netlify.</p>
       <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm font-semibold text-amber-950">Ver como
         <select aria-label="Perfil de la vista previa" value={role} onChange={e=>{setRole(e.target.value);setCompleted([]);setSelected('welcome');}}
           className="ml-2 rounded-lg border border-amber-300 bg-white px-3 py-2">
           {Object.entries(label).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
         <button onClick={()=>{setCompleted([]);setSelected('welcome');}} className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-semibold text-amber-950">Reiniciar progreso ficticio</button>
         <Link to="/aula/acceso" className="rounded-lg bg-[#005EB8] px-3 py-2 text-sm font-semibold text-white">Probar acceso privado</Link>
       </div>
     </div>
   </div>
   <AulaReaderView course={course} units={units} selected={selected} unit={unit} demo onOpen={open} onComplete={complete}/>
 </div>;
}
