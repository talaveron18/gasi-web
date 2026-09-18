import React from'react';
import{Link,useLocation}from'react-router-dom';

export default function NotFound(){
 const{pathname}=useLocation(),internal=pathname.startsWith('/interno');
 return <main className={`min-h-[70vh] flex items-center justify-center px-6 py-16 ${internal?'bg-slate-950 text-slate-100':'bg-white'}`} aria-labelledby="not-found-title">
  <div className="max-w-xl text-center">
   <p className={`text-sm font-semibold uppercase tracking-wide ${internal?'text-cyan-300':'text-[#005EB8]'}`}>Error 404</p>
   <h1 id="not-found-title" className={`mt-3 text-4xl font-bold ${internal?'text-white':'text-slate-900'}`}>Página no encontrada</h1>
   <p className={`mt-4 text-base ${internal?'text-slate-400':'text-slate-600'}`}>{internal?'La dirección interna no existe o ya no está disponible. Vuelve al canal clínico.':'La dirección que has abierto no existe o ha cambiado. Puedes volver al inicio o consultar los servicios de GASI.'}</p>
   <div className="mt-8 flex flex-wrap justify-center gap-3">
    <Link to={internal?'/interno/clinica':'/'} className={`rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 ${internal?'bg-cyan-400 text-slate-950 focus:ring-cyan-300 focus:ring-offset-slate-950':'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900'}`}>{internal?'Volver al canal clínico':'Volver al inicio'}</Link>
    {!internal&&<Link to="/servicios" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">Ver servicios</Link>}
   </div>
  </div>
 </main>;
}
