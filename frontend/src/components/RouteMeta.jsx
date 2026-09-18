import React,{useEffect}from'react';
import{useLocation}from'react-router-dom';

const pages=[
 ['/', 'GASI | Servicios sanitarios para empresas', 'Cobertura sanitaria, apoyo asistencial y formación para empresas y organizaciones.'],
 ['/servicios','Servicios sanitarios para empresas | GASI','Cobertura enfermera, apoyo médico remoto, fisioterapia, psicología y formación sanitaria configurados por centro.'],
 ['/cobertura-sanitaria','Cobertura sanitaria en empresas | GASI','Enfermería presencial y circuitos de apoyo sanitario adaptados a cada centro de trabajo.'],
 ['/servicios-sanitarios-organizaciones','Servicios sanitarios complementarios | GASI','Fisioterapia, psicología y apoyo médico remoto integrados cuando la operación del centro lo justifica.'],
 ['/formacion-sanitaria','Formación sanitaria para empresas | GASI','Primeros auxilios, reanimación cardiopulmonar y formación sanitaria adaptada a equipos de trabajo.'],
 ['/sectores','Sectores y centros de trabajo | GASI','Cobertura sanitaria para logística, industria, retail, centros corporativos y otros entornos de trabajo.'],
 ['/quienes-somos','Quiénes somos | GASI','Cómo diseña GASI servicios sanitarios claros, trazables y adaptados a la operativa de cada cliente.'],
 ['/contacto','Contacto | GASI','Contacte con GASI para estudiar la cobertura sanitaria o formación que necesita su centro.'],
 ['/politica-privacidad','Protección de datos | GASI','Información sobre el tratamiento de datos personales en la web pública y zona profesional de GASI.'],
 ['/politica-cookies','Política de cookies | GASI','Información sobre cookies y almacenamiento técnico utilizado por GASI.'],
 ['/aviso-legal','Aviso legal | GASI','Información legal sobre el uso de gasisalud.com y los canales públicos de GASI.']
];

const upsert=(selector,tag,attrs)=>{
 let node=document.head.querySelector(selector);
 if(!node){node=document.createElement(tag);document.head.appendChild(node);}
 Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));
 return node;
};
const remove=selector=>document.head.querySelector(selector)?.remove();

export default function RouteMeta(){
 const{pathname}=useLocation();
 useEffect(()=>{
  const internal=pathname.startsWith('/interno')||pathname.startsWith('/dashboard')||pathname.startsWith('/curso/');
  const match=pages.find(([path])=>path===pathname)||['','GASI | Grupo de Asistencia Sanitaria Integral','Servicios sanitarios y formación para empresas y organizaciones.'];
  const title=match[1],description=match[2],url=`https://gasisalud.com${pathname==='/'?'':pathname}`;
  document.title=title;
  upsert('meta[name="description"]','meta',{name:'description',content:description});
  upsert('meta[name="robots"]','meta',{name:'robots',content:internal?'noindex,nofollow':'index,follow'});
  if(internal){
   remove('link[rel="canonical"]');remove('meta[property="og:url"]');
  }else{
   upsert('link[rel="canonical"]','link',{rel:'canonical',href:url});
   upsert('meta[property="og:url"]','meta',{property:'og:url',content:url});
  }
  upsert('meta[property="og:type"]','meta',{property:'og:type',content:'website'});
  upsert('meta[property="og:site_name"]','meta',{property:'og:site_name',content:'GASI'});
  upsert('meta[property="og:title"]','meta',{property:'og:title',content:title});
  upsert('meta[property="og:description"]','meta',{property:'og:description',content:description});
  upsert('meta[name="twitter:card"]','meta',{name:'twitter:card',content:'summary'});
  upsert('meta[name="twitter:title"]','meta',{name:'twitter:title',content:title});
  upsert('meta[name="twitter:description"]','meta',{name:'twitter:description',content:description});
  window.scrollTo({top:0,behavior:'auto'});
 },[pathname]);
 return null;
}
