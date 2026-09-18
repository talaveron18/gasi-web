import React from'react';

export default function GasiBrand({inverse=false,compact=false}){
 return <div className="flex items-center gap-3" aria-label="GASI - Grupo de Asistencia Sanitaria Integral">
  <span className={`inline-flex items-center justify-center rounded-2xl font-black tracking-tight ${compact?'w-10 h-10 text-lg':'w-12 h-12 text-xl'} ${inverse?'bg-white text-[#005EB8]':'bg-[#005EB8] text-white'}`}>G</span>
  <span className={compact?'leading-tight':'leading-tight'}>
   <span className={`block font-extrabold tracking-tight ${compact?'text-xl':'text-2xl'} ${inverse?'text-white':'text-slate-950'}`}>GASI</span>
   {!compact&&<span className={`block text-[10px] uppercase tracking-[0.18em] ${inverse?'text-slate-300':'text-slate-500'}`}>Asistencia Sanitaria Integral</span>}
  </span>
 </div>;
}
