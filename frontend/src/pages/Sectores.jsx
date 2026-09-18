import React from'react';
import{Link}from'react-router-dom';
import{ArrowRight,Boxes,Building2,Factory,HardHat,ShoppingBag,Truck}from'lucide-react';

const sectors=[
 {icon:Truck,title:'Logística y distribución',text:'Centros con turnos, movimiento continuo de personal y actividad física donde la presencia sanitaria puede aportar capacidad de respuesta y coordinación.',needs:['Turnos amplios o escalonados','Carga física y manipulación','Alta concentración de trabajadores']},
 {icon:Factory,title:'Industria y producción',text:'Entornos con procesos productivos, equipos y tareas físicas que requieren una cobertura dimensionada a la operativa concreta.',needs:['Actividad física y técnica','Centros extensos','Necesidad de circuitos claros de escalado']},
 {icon:ShoppingBag,title:'Retail y grandes superficies',text:'Centros con plantilla distribuida, atención al público y ritmos de actividad variables a lo largo del día.',needs:['Afluencia variable','Plantillas numerosas','Cobertura adaptada a franjas de actividad']},
 {icon:Building2,title:'Campus y centros corporativos',text:'Organizaciones con muchos trabajadores concentrados en un mismo emplazamiento y necesidad de un recurso sanitario bien integrado.',needs:['Atención en centro','Coordinación interna','Formación sanitaria para equipos']},
 {icon:HardHat,title:'Construcción y proyectos',text:'Servicios que requieren estudiar cuidadosamente ubicación, turnos, accesibilidad y capacidad de respuesta antes de definir la cobertura.',needs:['Entornos cambiantes','Distribución por zonas','Planificación previa del dispositivo']},
 {icon:Boxes,title:'Otros centros de trabajo',text:'No limitamos el modelo a unos pocos sectores. Si existe una necesidad sanitaria clara, estudiamos el centro y definimos si GASI puede encajar.',needs:['Análisis del centro','Dimensionamiento del servicio','Propuesta adaptada']}
];

export default function Sectores(){
 return <div data-testid="sectores-page">
  <section className="bg-slate-950 text-white py-20"><div className="max-w-6xl mx-auto px-6"><p className="text-cyan-300 font-semibold uppercase tracking-wide text-sm">Sectores</p><h1 className="text-4xl lg:text-6xl font-bold mt-3 max-w-4xl">La cobertura depende más de cómo funciona el centro que de la etiqueta del sector</h1><p className="text-xl text-slate-300 mt-6 max-w-3xl">Actividad, turnos, distribución de trabajadores y patrón de incidencias son los datos que utilizamos para decidir qué servicio tiene sentido.</p></div></section>
  <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-7">{sectors.map(({icon:Icon,title,text,needs})=><article key={title} className="rounded-3xl border bg-white p-7 shadow-sm"><div className="w-12 h-12 rounded-xl bg-[#005EB8]/10 text-[#005EB8] flex items-center justify-center"><Icon className="w-6 h-6"/></div><h2 className="text-2xl font-bold text-slate-900 mt-5">{title}</h2><p className="text-slate-600 mt-3 leading-relaxed">{text}</p><ul className="mt-6 space-y-2">{needs.map(n=><li key={n} className="text-sm text-slate-600">✓ {n}</li>)}</ul></article>)}</div></section>
  <section className="py-18 bg-[#F3F7FB]"><div className="max-w-4xl mx-auto px-6 py-16 text-center"><h2 className="text-3xl lg:text-4xl font-bold text-slate-900">¿Su centro no encaja exactamente en estas categorías?</h2><p className="text-lg text-slate-600 mt-5">No pasa nada. Explíquenos la operativa y revisamos si existe una configuración sanitaria razonable.</p><Link to="/contacto" className="inline-flex items-center mt-8 bg-[#005EB8] text-white font-semibold px-7 py-3 rounded-xl">Estudiar mi centro <ArrowRight className="ml-2 w-5 h-5"/></Link></div></section>
 </div>;
}
