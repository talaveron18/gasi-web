import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Link,Navigate,useParams} from 'react-router-dom';
import {useAula,AULA_PREVIEW_DEMO} from './AulaAuthContext';
import AulaReaderView from './AulaReaderView';
import AulaAssessment from './AulaAssessment';
import AulaCommunity from './AulaCommunity';

export default function AulaReader(){
  const{courseId}=useParams(),{user,loading:authLoading,request}=useAula();
  const[course,setCourse]=useState(null),[units,setUnits]=useState([]),[selected,setSelected]=useState(null),[unit,setUnit]=useState(null);
  const[loading,setLoading]=useState(true),[error,setError]=useState(''),[completing,setCompleting]=useState(false);
  const currentUnit=useRef(null);
  const refresh=useCallback(async()=>{
    const data=await request('/courses/'+encodeURIComponent(courseId));
    if(!data.course||!Array.isArray(data.units))throw new Error('El servidor no ha devuelto el índice del curso.');
    setCourse(data.course);setUnits(data.units);
    return data.units;
  },[request,courseId]);
  const open=useCallback(async(id)=>{
    currentUnit.current=null;setError('');setUnit(null);setSelected(id);setLoading(true);
    try{
      const data=await request('/courses/'+encodeURIComponent(courseId)+'/units/'+encodeURIComponent(id));
      if(!data.unit||!Array.isArray(data.unit.content_blocks))throw new Error('Contenido de unidad no válido.');
      currentUnit.current=id;setUnit(data.unit);
      await refresh();
    }catch(e){
      setError(e.status===423?'Esta unidad está bloqueada: '+e.message:'No se ha podido abrir la unidad. '+e.message);
    }finally{setLoading(false);}
  },[courseId,request,refresh]);
  useEffect(()=>{
    if(!user||user.must_change_password)return;
    let active=true;
    (async()=>{
      setLoading(true);setError('');
      try{
        const data=await request('/courses/'+encodeURIComponent(courseId));
        if(!active)return;
        if(!data.course||!Array.isArray(data.units))throw new Error('Índice no válido.');
        setCourse(data.course);setUnits(data.units);
        const first=data.units.find(u=>u.open);
        if(first)await open(first.id);else setLoading(false);
      }catch(e){if(active){setLoading(false);setError('No se ha podido cargar el curso. '+e.message);}}
    })();
    return()=>{active=false;currentUnit.current=null;};
  },[user,courseId,request,open]);
  useEffect(()=>{
    if(!unit||!currentUnit.current||user?.role!=='student')return undefined;
    const id=currentUnit.current;
    const heartbeat=async()=>{
      if(document.visibilityState!=='visible'||currentUnit.current!==id)return;
      try{const updated=await request('/courses/'+encodeURIComponent(courseId)+'/units/'+encodeURIComponent(id)+'/heartbeat',{method:'POST',body:{}});
        if(Number.isFinite(updated.viewed_seconds)){
          setUnits(items=>items.map(u=>u.id===id?{...u,viewed_seconds:updated.viewed_seconds}:u));
          setUnit(prev=>prev?.id===id?{...prev,viewed_seconds:updated.viewed_seconds}:prev);
        }
      }catch{}
    };
    const timer=window.setInterval(heartbeat,20000);
    return()=>window.clearInterval(timer);
  },[unit,courseId,request,user]);
  const onStatus=useCallback(status=>{
    setUnit(prev=>prev?{...prev,...status}:prev);
    setUnits(prev=>prev.map(u=>u.id===currentUnit.current?{...u,...status}:u));
  },[]);
  const complete=async id=>{
    setCompleting(true);setError('');
    try{
      await request('/courses/'+encodeURIComponent(courseId)+'/units/'+encodeURIComponent(id)+'/heartbeat',{method:'POST',body:{}});
      await request('/courses/'+encodeURIComponent(courseId)+'/units/'+encodeURIComponent(id)+'/complete',{method:'POST',body:{}});
      const updated=await refresh();
      const next=updated.find((x,i)=>i>updated.findIndex(u=>u.id===id)&&x.open);
      if(next)await open(next.id);
    }catch(e){setError('No se ha podido completar la unidad. '+e.message);}
    finally{setCompleting(false);}
  };
  if(authLoading)return <p role="status" className="p-10">Comprobando acceso…</p>;
  if(!user||user.must_change_password)return <Navigate to="/aula/acceso" replace/>;
  return <div>
    <div className="mx-auto max-w-7xl px-4 pt-5"><Link className="text-sm font-semibold text-[#005EB8] underline" to={user.role==='admin'||user.role==='author'?'/aula/autor':'/aula/mis-cursos'}>Volver a mis cursos</Link></div>
    {course?<AulaReaderView course={course} units={units} selected={selected} unit={unit} loading={loading} error={error}
      onOpen={open} onComplete={complete} completing={completing} demo={AULA_PREVIEW_DEMO}
      metrics={user.role==='student'?{percent:units.length?Math.round(units.filter(u=>u.completed).length/units.length*100):0,
        done:units.filter(u=>u.completed).length,total:units.length,seconds:units.reduce((acc,u)=>acc+Number(u.viewed_seconds||0),0),
        today:Number(units[0]?.new_units_today||0),dailyMax:course.max_units_per_day}:null}
      assessmentPanel={!AULA_PREVIEW_DEMO&&user.role==='student'&&unit&&(unit.requires_test||unit.requires_practice)&&!loading?
        <AulaAssessment key={unit.id} courseId={courseId} unitId={unit.id} onStatus={onStatus}/>:null}/>
      {!AULA_PREVIEW_DEMO&&<AulaCommunity courseId={courseId} role={user.role} units={units}/>}</>:
      <main className="mx-auto max-w-4xl px-5 py-16">{loading?<p role="status">Cargando curso…</p>:<p role="alert">{error||'Curso no disponible.'}</p>}</main>}
  </div>;
}
