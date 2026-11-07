import React,{useCallback,useEffect,useState} from 'react';
import {Link,Navigate,useParams} from 'react-router-dom';
import {useAula} from './AulaAuthContext';
export default function AulaCertificates(){
 const {request,user,loading:authLoading}=useAula();
 const {certificateId}=useParams();
 const [items,setItems]=useState([]),[certificate,setCertificate]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 const refresh=useCallback(async()=>{
   if(!user||user.role!=='student')return;
   setBusy(true);setError('');
   try{
     if(certificateId){const r=await request('/my/certificates/'+certificateId);setCertificate(r.certificate);}
     else{const r=await request('/my/certificates');setItems(r.certificates||[]);}
   }catch(e){setError('No se puede cargar el certificado: '+e.message);}finally{setBusy(false);}
 },[request,user,certificateId]);
 useEffect(()=>{refresh();},[refresh]);
 if(authLoading)return <p role="status" className="p-10">Comprobando acceso al aula…</p>;
 if(!user||user.must_change_password)return <Navigate to="/aula/acceso" replace/>;
 if(user.role!=='student')return <Navigate to="/aula/autor" replace/>;
 return <main className="mx-auto min-h-[70vh] max-w-5xl space-y-5 bg-white px-5 py-10 text-slate-900" data-testid="aula-certificates">
   <Link className="print:hidden text-sm font-semibold text-[#005EB8] underline" to="/aula/mis-cursos">Volver a mis cursos</Link>
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
   {busy&&<p role="status">Cargando…</p>}
   {!certificateId&&<><h1 className="text-3xl font-bold">Mis certificados</h1>
     {!busy&&!items.length&&<p>Todavía no se ha emitido ningún certificado.</p>}
     <ul className="space-y-3">{items.map(c=><li key={c.id} className="rounded-xl border p-5">
       <strong className="block">{c.title}</strong><p className="mt-2 text-sm">Emitido el {new Date(c.issued_at).toLocaleDateString('es-ES')} · {c.duration_hours} horas</p>
       <Link className="mt-2 inline-block text-[#005EB8] underline" to={'/aula/certificado/'+c.id}>Consultar certificado</Link></li>)}</ul></>}
   {certificateId&&certificate&&<><div className="mx-auto my-10 max-w-3xl border-8 border-double border-slate-300 p-8 text-center print:border-slate-900">
     <p className="font-bold uppercase tracking-[0.2em] text-[#005EB8]">GASI · Aula Virtual</p>
     <h1 className="mt-8 text-3xl font-bold">Certificado de finalización</h1>
     <p className="mt-8">Se hace constar que</p><p className="mt-2 text-2xl font-semibold">{certificate.student_name}</p>
     <p className="mt-7">ha completado la formación</p><h2 className="mt-2 text-xl font-bold">{certificate.course_title}</h2>
     <p className="mt-5">Duración: {certificate.duration_hours} horas</p>
     <p className="mt-2">Fecha de emisión: {new Date(certificate.issued_at).toLocaleDateString('es-ES')}</p>
     <p className="mt-7 font-mono text-sm">Código de certificado: {certificate.certificate_code}</p>
     <p className="mt-8 text-xs text-slate-600">Documento de finalización del curso. No equivale por sí solo a una titulación oficial ni acredita habilitaciones profesionales.</p>
   </div>
   <button className="print:hidden rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white" onClick={()=>window.print()}>Imprimir o guardar en PDF</button></>}
 </main>;
}
