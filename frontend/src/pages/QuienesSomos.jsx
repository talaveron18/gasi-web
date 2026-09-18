import React from'react';
import{Link}from'react-router-dom';
import{ArrowRight,Network,ShieldCheck,Stethoscope,Target,Users}from'lucide-react';

const values=[
 {icon:Target,title:'Alcance claro',text:'Cada propuesta define qué se presta, con qué profesionales y qué queda fuera.'},
 {icon:Stethoscope,title:'Criterio sanitario',text:'El servicio se diseña alrededor de necesidades reales del centro, no de un catálogo genérico.'},
 {icon:Network,title:'Coordinación',text:'Presencia en centro, apoyo remoto y escalado se organizan como un circuito único.'},
 {icon:ShieldCheck,title:'Trazabilidad',text:'Accesos, decisiones y cambios se plantean para poder reconstruir qué ocurrió y quién actuó.'},
 {icon:Users,title:'Operativa B2B',text:'Trabajamos para integrarnos en centros, turnos y procesos de empresas y organizaciones.'}
];

export default function QuienesSomos(){
 return <div data-testid="quienes-somos-page">
  <section className="bg-slate-950 text-white"><div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
   <div><p className="text-cyan-300 font-semibold uppercase tracking-wide text-sm">Quiénes somos</p><h1 className="text-4xl lg:text-6xl font-bold mt-3">GASI nace para organizar asistencia sanitaria dentro de la operativa real de una empresa</h1><p className="text-xl text-slate-300 mt-6 leading-relaxed">Nuestro trabajo es convertir una necesidad difusa —“queremos cobertura sanitaria en el centro”— en un servicio concreto: profesionales, horarios, funciones, circuitos y límites definidos.</p><Link to="/contacto" className="inline-flex items-center mt-8 bg-white text-[#005EB8] font-bold px-6 py-3 rounded-xl">Hablar con GASI <ArrowRight className="ml-2 w-5 h-5"/></Link></div>
   <div className="rounded-3xl bg-gradient-to-br from-[#005EB8] to-cyan-500 p-[1px]"><div className="rounded-[calc(1.5rem-1px)] bg-slate-900 p-8 lg:p-10"><p className="text-cyan-300 text-sm font-semibold uppercase tracking-wide">Cómo pensamos el servicio</p><div className="mt-6 space-y-6">{['Primero entendemos el centro y sus turnos.','Después definimos qué recurso sanitario aporta valor.','Por último dejamos funciones, accesos y escalado claros antes de arrancar.'].map((x,i)=><div key={x} className="flex gap-4"><span className="w-9 h-9 shrink-0 rounded-full bg-cyan-300 text-slate-950 font-bold flex items-center justify-center">{i+1}</span><p className="text-lg text-slate-200 pt-1">{x}</p></div>)}</div></div></div>
  </div></section>
  <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[.85fr_1.15fr] gap-14 items-start"><div><p className="text-[#005EB8] font-semibold uppercase tracking-wide text-sm">Nuestro enfoque</p><h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-2">No queremos vender “de todo”</h2><p className="text-lg text-slate-600 mt-5 leading-relaxed">Preferimos una oferta más estrecha y bien definida: cobertura enfermera, apoyo médico remoto cuando proceda, fisioterapia, psicología puntual y formación sanitaria. Cada elemento entra solo cuando encaja con el servicio concreto.</p><p className="text-lg text-slate-600 mt-5 leading-relaxed">GASI no se presenta como servicio de prevención ajeno ni ofrece dentro de esta propuesta vigilancia de la salud, evaluación de riesgos, gestión de bajas o reconocimientos médicos laborales.</p></div><div className="grid sm:grid-cols-2 gap-5">{values.map(({icon:Icon,title,text})=><article key={title} className="rounded-2xl border bg-slate-50 p-6"><div className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Icon className="w-5 h-5"/></div><h3 className="text-xl font-bold text-slate-900 mt-4">{title}</h3><p className="text-slate-600 mt-2">{text}</p></article>)}</div></div></section>
  <section className="py-20 bg-[#F3F7FB]"><div className="max-w-6xl mx-auto px-6"><div className="max-w-3xl"><p className="text-[#005EB8] font-semibold uppercase tracking-wide text-sm">Qué puede esperar un cliente</p><h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-2">Una propuesta que explique qué va a ocurrir el día uno</h2></div><div className="grid md:grid-cols-3 gap-6 mt-10">{[
   ['1','Diseño del servicio','Centro, turnos, perfiles, cobertura y recursos.'],
   ['2','Puesta en marcha','Altas, accesos, protocolos, coordinación y contingencias.'],
   ['3','Operación y mejora','Seguimiento, incidencias, trazabilidad y ajustes cuando sean necesarios.']
  ].map(([n,t,x])=><article key={n} className="rounded-2xl bg-white border p-7"><span className="text-5xl font-black text-[#005EB8]/15">{n}</span><h3 className="text-xl font-bold text-slate-900 mt-2">{t}</h3><p className="text-slate-600 mt-3">{x}</p></article>)}</div></div></section>
  <section className="py-20 bg-[#005EB8] text-white"><div className="max-w-4xl mx-auto px-6 text-center"><h2 className="text-3xl lg:text-4xl font-bold">Si el alcance está claro, la operación empieza mejor</h2><p className="text-xl text-white/85 mt-5">Cuéntenos qué necesita su centro y veremos si GASI puede encajar.</p><Link to="/contacto" className="inline-flex items-center mt-8 bg-white text-[#005EB8] font-bold px-7 py-3 rounded-xl">Contactar <ArrowRight className="ml-2 w-5 h-5"/></Link></div></section>
 </div>;
}
