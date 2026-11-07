import React,{useCallback,useEffect,useState} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {BookOpen,CalendarDays,Clock,LogOut,RefreshCw,ShieldCheck} from 'lucide-react';
import {useAula} from './AulaAuthContext';

export default function AulaCourses(){
  const{user,loading,request,logout}=useAula();
  const[courses,setCourses]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState('');
  const refresh=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const data=await request('/my/courses');
      if(!Array.isArray(data.courses))throw new Error('El servidor no ha devuelto una lista válida.');
      setCourses(data.courses);
    }catch(e){setCourses([]);setError('No ha sido posible cargar tus cursos. '+e.message);}
    finally{setBusy(false);}
  },[request]);
  useEffect(()=>{if(user&&!user.must_change_password)refresh();},[user,refresh]);
  if(loading)return <p role="status" className="p-8">Comprobando acceso al aula…</p>;
  if(!user||user.must_change_password)return <Navigate to="/aula/acceso" replace/>;
  return <main className="min-h-[75vh] bg-slate-50 text-slate-900" data-testid="aula-courses">
    <div className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider">Aula Virtual GASI</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Mis cursos</h1><p className="mt-2 text-blue-100">Hola, {user.name}. Aquí puedes consultar tu formación asignada.</p></div>
          <button onClick={logout} type="button" className="flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2 font-semibold"><LogOut size={17}/> Cerrar sesión</button>
        </div>
      </div>
    </div>
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-bold">Formación disponible</h2>
        <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50"><RefreshCw size={17}/> Actualizar</button>
      </div>
      {error&&<p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</p>}
      {busy&&<p role="status">Cargando cursos desde el servidor…</p>}
      {!busy&&courses.length===0&&!error&&<p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Todavía no tienes cursos asignados. GASI debe darte de alta en una formación; no existe automatrícula pública.</p>}
      {!busy&&<div className="grid gap-5 md:grid-cols-2">{courses.map(course=><article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#005EB8]"><BookOpen size={17}/> Formación asignada</div>
        <h3 className="mt-3 text-xl font-bold">{course.title}</h3><p className="mt-3 line-clamp-3 text-sm text-slate-600">{course.objective||'Consulta la presentación y metodología en la unidad de bienvenida.'}</p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><Clock size={16}/> {course.duration_hours||'—'} horas</span>
          <span className="inline-flex items-center gap-1"><CalendarDays size={16}/> {course.deadline?new Date(course.deadline).toLocaleDateString('es-ES'):'Plazo definido por GASI'}</span>
        </div>
        <Link to={'/aula/curso/'+course.id} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white hover:bg-[#004a92]">Entrar al curso <BookOpen size={17}/></Link>
      </article>)}</div>}
      <p className="mt-8 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16}/> Tu actividad y tiempo de conexión se registran para el seguimiento académico.</p>
    </div>
  </main>;
}
