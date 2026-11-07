import React,{useCallback,useEffect,useState} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {BookOpen,CheckCircle2,GraduationCap,Plus,ShieldCheck,Users} from 'lucide-react';
import {useAula,AULA_PREVIEW_DEMO} from './AulaAuthContext';
import AulaTutor from './AulaTutor';
import AulaAssessmentEditor from './AulaAssessmentEditor';

const input="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus-visible:ring-2 focus-visible:ring-[#005EB8]";
const primary="rounded-lg bg-[#005EB8] px-4 py-2.5 font-semibold text-white disabled:opacity-50";
const blankCourse={title:'',objective:'',target_audience:'',requirements:'',presentation:'',duration_hours:20,access_days:90,max_units_per_day:''};
const emptyUnit=()=>({unit_no:1,title:'',introduction:'',content_blocks:[{type:'heading',level:1,text:''},{type:'text',text:''}],learning_outcomes:[{id:'RA1',text:''}],requires_test:false,requires_practice:false});

function CourseEditor({courseId,request,users,role,onSaved}){
  const [course,setCourse]=useState(null),[units,setUnits]=useState([]),[selected,setSelected]=useState(null);
  const [draft,setDraft]=useState(emptyUnit()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [student,setStudent]=useState(''),[tutor,setTutor]=useState('');
  const refresh=useCallback(async()=>{
    const data=await request('/courses/'+courseId);
    setCourse(data.course);setUnits(data.units);
    return data.units;
  },[courseId,request]);
  useEffect(()=>{refresh().catch(e=>setError('No se ha podido cargar el curso: '+e.message));},[refresh]);
  const choose=async(id)=>{
    setError('');setNotice('');setBusy(true);
    try{
      const data=await request('/courses/'+courseId+'/units/'+id);
      const u=data.unit;setSelected(id);
      setDraft({...u,learning_outcomes:Array.isArray(u.learning_outcomes)?u.learning_outcomes:[],content_blocks:Array.isArray(u.content_blocks)?u.content_blocks:[]});
    }catch(e){setError('No se ha podido abrir la unidad: '+e.message);}finally{setBusy(false);}
  };
  const changeBlock=(i,key,value)=>setDraft(p=>({...p,content_blocks:p.content_blocks.map((b,n)=>n===i?{...b,[key]:value}:b)}));
  const save=async()=>{
    setBusy(true);setError('');setNotice('');
    try{
      const payload={...draft,unit_no:Number(draft.unit_no),
        content_blocks:draft.content_blocks.filter(b=>b.text?.trim()||b.type==='image'||b.type==='video'),
        learning_outcomes:draft.learning_outcomes.filter(x=>x.id?.trim()&&x.text?.trim())};
      if(selected)await request('/admin/courses/'+courseId+'/units/'+selected,{method:'PATCH',body:payload});
      else await request('/admin/courses/'+courseId+'/units',{method:'POST',body:payload});
      const updated=await refresh();setNotice('Unidad guardada como borrador.');
      if(!selected){setDraft(emptyUnit());setDraft(p=>({...p,unit_no:updated.length}));}
    }catch(e){setError('No se ha guardado la unidad: '+e.message);}finally{setBusy(false);}
  };
  const publish=async()=>{
    if(!window.confirm('¿Activar este curso? Su estructura quedará bloqueada.'))return;
    setBusy(true);setError('');setNotice('');
    try{await request('/admin/courses/'+courseId+'/publish',{method:'POST',body:{}});await refresh();await onSaved();setNotice('Curso activado. Ahora se puede matricular alumnado.');}
    catch(e){setError('No se puede activar el curso: '+e.message);}finally{setBusy(false);}
  };
  const enroll=async()=>{
    if(!student)return;setBusy(true);setError('');setNotice('');
    try{await request('/admin/enrollments',{method:'POST',body:{student_id:student,course_id:courseId}});setNotice('Matrícula creada.');setStudent('');}
    catch(e){setError('No se ha creado la matrícula: '+e.message);}finally{setBusy(false);}
  };
  const assign=async()=>{
    if(!tutor)return;setBusy(true);setError('');setNotice('');
    try{await request('/admin/tutors',{method:'POST',body:{tutor_id:tutor,course_id:courseId}});setNotice('Tutor asignado al curso.');setTutor('');}
    catch(e){setError('No se ha asignado el tutor: '+e.message);}finally{setBusy(false);}
  };
  if(!course)return <p role="status">{error||'Cargando estructura del curso…'}</p>;
  const editable=course.status==='draft';
  const students=users.filter(u=>u.role==='student'&&u.active!==false),tutors=users.filter(u=>u.role==='tutor'&&u.active!==false);
  return <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" data-testid="aula-course-editor">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">{course.title}</h2>
      <p className="mt-1 text-sm text-slate-600">Estado: {editable?'Borrador — editable':'Activo — estructura bloqueada'}</p></div>
      <Link className="rounded-lg border border-[#005EB8] px-4 py-2 text-sm font-semibold text-[#005EB8]" to={'/aula/curso/'+courseId}>Vista del lector</Link>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</p>}
    {notice&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
    <div><h3 className="mb-3 font-bold">Unidades y resultados de aprendizaje</h3>
      <div className="flex flex-wrap gap-2">{units.map(u=><button key={u.id} type="button" onClick={()=>choose(u.id)}
        className={(selected===u.id?'border-blue-600 bg-blue-50':'border-slate-300 bg-white')+' rounded-lg border px-3 py-2 text-left text-sm'}>Unidad {u.unit_no}: {u.title}</button>)}
        {editable&&<button type="button" onClick={()=>{setSelected(null);setDraft({...emptyUnit(),unit_no:units.length});setError('');setNotice('');}}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[#005EB8] px-3 py-2 text-sm font-semibold text-[#005EB8]"><Plus size={16}/> Nueva unidad</button>}
      </div>
    </div>
    {editable&&<div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold">{selected?'Editar unidad':'Crear unidad'}</h3>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <label className="text-sm font-semibold">Número<input type="number" min="0" disabled={!!selected} value={draft.unit_no} onChange={e=>setDraft(p=>({...p,unit_no:e.target.value}))} className={input}/></label>
        <label className="text-sm font-semibold">Título<input maxLength={180} value={draft.title} onChange={e=>setDraft(p=>({...p,title:e.target.value}))} className={input}/></label>
      </div>
      <label className="block text-sm font-semibold">Introducción<textarea rows={2} maxLength={3000} value={draft.introduction||''} onChange={e=>setDraft(p=>({...p,introduction:e.target.value}))} className={input}/></label>
      <h4 className="font-semibold">Bloques del contenido</h4>
      {(draft.content_blocks||[]).map((b,i)=><div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]"><label className="text-sm">Tipo<select className={input} value={b.type} onChange={e=>changeBlock(i,'type',e.target.value)}>
          <option value="heading">Título</option><option value="text">Párrafo</option><option value="callout">Caja</option><option value="image">Imagen</option><option value="video">Vídeo</option></select></label>
          {b.type==='heading'&&<label className="text-sm">Nivel<select className={input} value={b.level||2} onChange={e=>changeBlock(i,'level',Number(e.target.value))}>
            {[1,2,3,4].map(n=><option key={n} value={n}>H{n}</option>)}</select></label>}
          {b.type==='callout'&&<label className="text-sm">Estilo<select className={input} value={b.style||'recuerda'} onChange={e=>changeBlock(i,'style',e.target.value)}>
            {['recuerda','importante','ejemplo','resumen'].map(s=><option key={s} value={s}>{s}</option>)}</select></label>}
        </div>
        {(b.type==='image'||b.type==='video')&&<label className="mt-3 block text-sm">URL HTTPS<input value={b.src||''} onChange={e=>changeBlock(i,'src',e.target.value)} className={input}/></label>}
        {b.type==='image'&&<label className="mt-3 block text-sm">Texto alternativo<input value={b.alt||''} onChange={e=>changeBlock(i,'alt',e.target.value)} className={input}/></label>}
        <label className="mt-3 block text-sm">{b.type==='heading'?'Texto del título':b.type==='image'||b.type==='video'?'Pie o descripción':'Contenido'}
          <textarea rows={b.type==='text'?5:2} value={b.text||''} onChange={e=>changeBlock(i,'text',e.target.value)} className={input}/></label>
        <button type="button" className="mt-2 text-xs font-semibold text-rose-700 underline" onClick={()=>setDraft(p=>({...p,content_blocks:p.content_blocks.filter((_,n)=>n!==i)}))}>Eliminar bloque</button>
      </div>)}
      <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" onClick={()=>setDraft(p=>({...p,content_blocks:[...p.content_blocks,{type:'text',text:''}]}))}>Añadir bloque</button>
      <h4 className="font-semibold">Resultados de aprendizaje</h4>
      {(draft.learning_outcomes||[]).map((o,i)=><div key={i} className="grid gap-2 sm:grid-cols-[90px_1fr]"><input aria-label={'Código del RA '+(i+1)} value={o.id} onChange={e=>setDraft(p=>({...p,learning_outcomes:p.learning_outcomes.map((x,j)=>i===j?{...x,id:e.target.value}:x)}))} className={input} placeholder="RA1"/><input aria-label={'Descripción del RA '+(i+1)} value={o.text} onChange={e=>setDraft(p=>({...p,learning_outcomes:p.learning_outcomes.map((x,j)=>i===j?{...x,text:e.target.value}:x)}))} className={input} placeholder="Al finalizar podrá…"/></div>)}
      <button type="button" onClick={()=>setDraft(p=>({...p,learning_outcomes:[...p.learning_outcomes,{id:'RA'+(p.learning_outcomes.length+1),text:''}]}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Añadir RA</button>
      <p className="text-sm text-slate-600">Tras guardar la unidad puedes configurar un banco de 15 preguntas y una práctica con rúbrica. La activación del curso exigirá que las evaluaciones obligatorias estén completas.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.requires_test===true} onChange={e=>setDraft(p=>({...p,requires_test:e.target.checked}))}/> Requiere superar un test</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.requires_practice===true} onChange={e=>setDraft(p=>({...p,requires_practice:e.target.checked}))}/> Requiere práctica evaluada</label>
      <button disabled={busy} type="button" onClick={save} className={primary}>{busy?'Guardando…':'Guardar unidad'}</button>
      {selected&&(draft.requires_test||draft.requires_practice)&&<AulaAssessmentEditor key={selected} courseId={courseId} unitId={selected}
        requiresTest={draft.requires_test} requiresPractice={draft.requires_practice} request={request}/>}
    </div>}
    {editable&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-900">Antes de activar: incluye contenido en la Unidad 0 y al menos una unidad con resultados de aprendizaje. Al activar el curso se congela su estructura.</p>
      <button disabled={busy} type="button" onClick={publish} className={primary+' mt-3'}>Activar curso</button>
    </div>}
    {course.status==='active'&&<>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold">Matricular alumnado</h3>
          {role!=='admin'&&students.length===0&&<p className="text-sm text-slate-600">Administración debe proporcionar el identificador del alumno.</p>}
          <label className="block text-sm">Alumno {role==='admin'?'':'(identificador de cuenta)'}</label>
          {role==='admin'?<select value={student} onChange={e=>setStudent(e.target.value)} className={input}><option value="">Seleccionar alumno</option>{students.map(u=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select>:<input value={student} onChange={e=>setStudent(e.target.value)} className={input} placeholder="UUID del alumno"/>}
          <button disabled={!student||busy} type="button" onClick={enroll} className={primary}>Matricular</button>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold">Asignar tutor</h3>
          {role==='admin'?<select value={tutor} onChange={e=>setTutor(e.target.value)} className={input}><option value="">Seleccionar tutor</option>{tutors.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>:<input value={tutor} onChange={e=>setTutor(e.target.value)} className={input} placeholder="UUID del tutor"/>}
          <button disabled={!tutor||busy} type="button" onClick={assign} className={primary}>Asignar tutor</button>
        </div>
      </div>
    </>}
  </section>;
}

export default function AulaAuthor(){
  const{user,loading,request,logout}=useAula();
  const[courses,setCourses]=useState([]),[users,setUsers]=useState([]),[newCourse,setNewCourse]=useState(blankCourse);
  const[createUser,setCreateUser]=useState({name:'',email:'',role:'student',temporary_password:''});
  const[active,setActive]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const refresh=useCallback(async()=>{
    const result=await request('/my/courses');
    if(!Array.isArray(result.courses))throw new Error('Listado de cursos inválido.');
    setCourses(result.courses);
  },[request]);
  useEffect(()=>{
    if(!user||user.must_change_password||!['admin','author','tutor'].includes(user.role))return;
    refresh().catch(e=>setError(e.message));
    if(user.role==='admin')request('/admin/users').then(x=>setUsers(Array.isArray(x.users)?x.users:[])).catch(()=>setUsers([]));
  },[user,request,refresh]);
  if(loading)return <p role="status" className="p-8">Comprobando acceso…</p>;
  if(!user||user.must_change_password)return <Navigate to="/aula/acceso" replace/>;
  if(!['admin','author','tutor'].includes(user.role))return <Navigate to="/aula/mis-cursos" replace/>;
  const create=async()=>{
    setBusy(true);setError('');setNotice('');
    try{
      const p={...newCourse,max_units_per_day:newCourse.max_units_per_day===''?null:Number(newCourse.max_units_per_day)};
      const r=await request('/admin/courses',{method:'POST',body:p});setActive(r.course.id);setNewCourse(blankCourse);
      await refresh();setNotice('Curso creado con su Unidad 0 de bienvenida. Completa la metodología antes de activarlo.');
    }catch(e){setError('No se pudo crear el curso: '+e.message);}finally{setBusy(false);}
  };
  const provision=async()=>{
    setBusy(true);setError('');setNotice('');
    try{
      await request('/admin/users',{method:'POST',body:createUser});
      const list=await request('/admin/users');setUsers(list.users||[]);
      setCreateUser({name:'',email:'',role:'student',temporary_password:''});setNotice('Cuenta creada. Entrega la contraseña provisional por un canal seguro, nunca por correo sin protección.');
    }catch(e){setError('No se pudo dar de alta la cuenta: '+e.message);}finally{setBusy(false);}
  };
  return <main className="min-h-[80vh] bg-slate-50 px-5 py-10 text-slate-900" data-testid="aula-author">
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#005EB8]">Aula Virtual GASI</p>
        <h1 className="mt-1 text-3xl font-bold">Gestión de formación</h1><p className="mt-2 text-slate-600">Perfil: {user.role==='admin'?'Administración':user.role==='author'?'Autor':'Tutor'} · {user.name}</p></div>
        <button onClick={logout} type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cerrar sesión</button>
      </div>
      {AULA_PREVIEW_DEMO&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Panel de autor en vista previa. Las cuentas y cursos son ficticios. Las operaciones de escritura están deshabilitadas; el aula real utilizará PostgreSQL.</p>}
      {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</p>}
      {notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
      {user.role==='admin'&&<details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-bold">Alta interna de usuarios (sin registro público)</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Nombre<input className={input} value={createUser.name} onChange={e=>setCreateUser(p=>({...p,name:e.target.value}))}/></label>
          <label className="text-sm font-semibold">Email<input type="email" className={input} value={createUser.email} onChange={e=>setCreateUser(p=>({...p,email:e.target.value}))}/></label>
          <label className="text-sm font-semibold">Rol<select className={input} value={createUser.role} onChange={e=>setCreateUser(p=>({...p,role:e.target.value}))}>
            <option value="student">Alumno</option><option value="tutor">Tutor</option><option value="author">Autor</option><option value="admin">Administrador</option></select></label>
          <label className="text-sm font-semibold">Contraseña provisional (12 caracteres mínimo)<input type="password" autoComplete="new-password" minLength={12} className={input} value={createUser.temporary_password} onChange={e=>setCreateUser(p=>({...p,temporary_password:e.target.value}))}/></label>
        </div>
        <button disabled={busy} type="button" onClick={provision} className={primary+' mt-4'}>Crear cuenta</button>
        <div className="mt-5"><h3 className="font-semibold">Usuarios existentes</h3>
          <ul className="mt-2 space-y-1 text-sm">{users.map(u=><li key={u.id}>{u.name} · {u.email} · {u.role}{u.active===false?' (inactivo)':''}</li>)}</ul>
        </div>
      </details>}
      {user.role!=='tutor'&&<details open={!active} className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-bold">Crear curso</summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ['title','Título del curso'],['objective','Objetivo general'],['target_audience','Dirigido a'],['requirements','Requisitos'],['presentation','Presentación']
          ].map(([key,label])=><label key={key} className="text-sm font-semibold">{label}<textarea className={input} rows={key==='presentation'?3:2} value={newCourse[key]} onChange={e=>setNewCourse(p=>({...p,[key]:e.target.value}))}/></label>)}
          <label className="text-sm font-semibold">Duración en horas<input className={input} type="number" min="1" max="2000" value={newCourse.duration_hours} onChange={e=>setNewCourse(p=>({...p,duration_hours:Number(e.target.value)}))}/></label>
          <label className="text-sm font-semibold">Plazo de acceso (días)<input className={input} type="number" min="1" max="730" value={newCourse.access_days} onChange={e=>setNewCourse(p=>({...p,access_days:Number(e.target.value)}))}/></label>
          <label className="text-sm font-semibold">Unidades nuevas por día (opcional)<input className={input} type="number" min="1" max="100" placeholder="Sin límite" value={newCourse.max_units_per_day} onChange={e=>setNewCourse(p=>({...p,max_units_per_day:e.target.value}))}/></label>
        </div><button disabled={busy} type="button" onClick={create} className={primary+' mt-4'}><Plus size={16} className="inline"/> Crear borrador</button>
      </details>}
      <section className="space-y-3"><h2 className="flex items-center gap-2 text-xl font-bold"><GraduationCap size={21}/> Cursos gestionados</h2>
        {courses.length===0&&<p className="rounded-xl bg-white p-5 text-slate-600">Todavía no hay cursos asignados a este perfil.</p>}
        <div className="grid gap-3 sm:grid-cols-2">{courses.map(course=><button key={course.id} type="button" onClick={()=>{setActive(course.id);setError('');}}
          className={(active===course.id?'border-blue-500 bg-blue-50':'border-slate-200 bg-white')+' rounded-xl border p-4 text-left'}>
          <strong className="block text-lg">{course.title}</strong><span className="mt-1 block text-sm text-slate-600">{course.status||'Activo'} · {course.duration_hours||'—'} h</span>
        </button>)}</div>
      </section>
      {active&&user.role!=='tutor'&&<CourseEditor key={active} courseId={active} request={request} users={users} role={user.role} onSaved={refresh}/>}
      {user.role==='tutor'&&<AulaTutor/>}
      {active&&user.role==='tutor'&&<Link className="inline-flex items-center gap-2 rounded-lg bg-[#005EB8] p-3 text-white" to={'/aula/curso/'+active}><BookOpen size={18}/> Consultar contenido asignado</Link>}
      <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16}/> La estructura de un curso activo no se modifica. F3 incorpora el banco de preguntas y la corrección de prácticas con permisos independientes.</p>
    </div>
  </main>;
}
