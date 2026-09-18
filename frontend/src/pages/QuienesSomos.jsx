import React from'react';
import{Link}from'react-router-dom';
import{ArrowRight,Network,ShieldCheck,Stethoscope,Target,Users}from'lucide-react';

const principles=[
 {icon:Target,title:'Alcance claro',text:'Cada propuesta define qué se presta, dónde, durante qué horario y con qué profesionales.'},
 {icon:ShieldCheck,title:'Seguridad y trazabilidad',text:'Diseñamos accesos, registros y correcciones para que la actividad sea reconstruible y controlable.'},
 {icon:Network,title:'Coordinación',text:'La cobertura se organiza como un servicio único, con circuitos claros entre presencia, apoyo remoto y escalado.'},
 {icon:Stethoscope,title:'Criterio sanitario',text:'Cada perfil actúa dentro de su ámbito profesional y de la configuración contratada.'},
 {icon:Users,title:'Adaptación al centro',text:'La propuesta parte de la operativa real: actividad, turnos, distribución y necesidades del cliente.'}
];

export default function QuienesSomos(){
 return <div data-testid="quienes-somos-page">
  <section className="bg-slate-950 text-white py-20"><div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
   <div><p className="text-cyan-300 font-semibold uppercase tracking-wide text-sm">Quiénes somos</p><h1 className="text-4xl lg:text-6xl font-bold mt-3">Un operador sanitario B2B centrado en hacer que el servicio funcione en el centro de trabajo</h1><p className="text-xl text-slate-300 mt-6 leading-relaxed">GASI organiza coberturas sanitarias y formación para empresas y organizaciones. Nuestro trabajo empieza antes de asignar profesionales: entender la operación, definir el alcance y construir los circuitos necesarios para prestar el servicio con claridad.</p><Link to="/contacto" className="inline-flex items-center mt-8 bg-white text-[#005EB8] font-bold px-6 py-3 rounded-xl">Hablar con coordinación <ArrowRight className="ml-2 w-5 h-5"/></Link></div>
   <div className="grid gap-4"><div className="rounded-3xl bg-[#005EB8] p-8"><p className="text-cyan-100 text-sm uppercase tracking-wide font-semibold">Nuestra idea</p><h2 className="text-3xl font-bold mt-2">No vender recursos aislados. Diseñar una cobertura coherente.</h2></div><div className="rounded-3xl border border-slate-700 bg-slate-900 p-8"><p className="text-slate-300">Una empresa puede necesitar enfermería, apoyo médico remoto, fisioterapia, psicología, formación o una combinación de varios recursos. La decisión depende del centro, no de un catálogo estándar.</p></div></div>
  </div></section>
  <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[.85fr_1.15fr] gap-14 items-start">
   <div><p className="text-[#005EB8] font-semibold uppercase tracking-wide text-sm">Cómo trabajamos</p><h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-2">Primero la operación. Después el dispositivo sanitario.</h2><p className="text-lg text-slate-600 mt-5 leading-relaxed">Revisamos turnos, actividad, concentración de trabajadores, distribución física y necesidades previsibles. A partir de ahí definimos qué perfiles y circuitos pueden aportar valor real.</p></div>
   <div className="grid sm:grid-cols-2 gap-5">{principles.map(({icon:Icon,title,text})=><article key={title} className="rounded-2xl border bg-slate-50 p-6"><div className="w-11 h-11 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Icon className="w-5 h-5"/></div><h3 className="text-xl font-bold text-slate-900 mt-4">{title}</h3><p className="text-slate-600 mt-2 leading-relaxed">{text}</p></article>)}</div>
  </div></section>
  <section className="py-20 bg-[#F3F7FB]"><div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
   <div><p className="text-[#005EB8] font-semibold uppercase tracking-wide text-sm">Qué somos</p><h2 className="text-3xl font-bold text-slate-900 mt-2">Servicios sanitarios para organizaciones</h2><p className="text-lg text-slate-600 mt-5">La oferta puede incluir enfermería presencial, apoyo médico remoto asociado, fisioterapia, psicología y formación sanitaria, siempre con alcance definido y requisitos aplicables resueltos antes del inicio.</p></div>
   <div><p className="text-[#005EB8] font-semibold uppercase tracking-wide text-sm">Qué no somos</p><h2 className="text-3xl font-bold text-slate-900 mt-2">No somos un servicio de prevención ajeno</h2><p className="text-lg text-slate-600 mt-5">No presentamos esta oferta como vigilancia de la salud, reconocimientos médicos laborales, evaluación de riesgos ni gestión de bajas. Si una necesidad queda fuera de nuestro alcance, se identifica como tal.</p></div>
  </div></section>
  <section className="py-20 bg-[#005EB8] text-white"><div className="max-w-4xl mx-auto px-6 text-center"><h2 className="text-3xl lg:text-4xl font-bold">¿Quiere saber si GASI encaja en su centro?</h2><p className="text-xl text-white/85 mt-5">Cuéntenos cómo funciona la operación y revisamos qué cobertura tendría sentido plantear.</p><Link to="/contacto" className="inline-flex items-center mt-8 bg-white text-[#005EB8] font-bold px-7 py-3 rounded-xl">Contactar <ArrowRight className="ml-2 w-5 h-5"/></Link></div></section>
 </div>;
}
