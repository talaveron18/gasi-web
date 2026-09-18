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

const ensureMeta=(name,content)=>{
 let node=document.head.querySelector(`meta[name="${name}"]`);
 if(!node){node=document.createElement('meta');node.setAttribute('name',name);document.head.appendChild(node);}
 node.setAttribute('content',content);
};
const ensureCanonical=href=>{
 let node=document.head.querySelector('link[rel="canonical"]');
 if(!node){node=document.createElement('link');node.setAttribute('rel','canonical');document.head.appendChild(node);}
 node.setAttribute('href',href);
};

export default function RouteMeta(){
 const {pathname}=useLocation();
 useEffect(()=>{
  const internal=pathname.startsWith('/interno')||pathname.startsWith('/dashboard')||pathname.startsWith('/curso/');
  const match=pages.find(([path])=>path===pathname)||['','GASI | Grupo de Asistencia Sanitaria Integral','Servicios sanitarios y formación para empresas y organizaciones.'];
  document.title=match[1];
  ensureMeta('description',match[2]);
  ensureMeta('robots',internal?'noindex,nofollow':'index,follow');
  const canonical=document.head.querySelector('link[rel="canonical"]');
  if(internal){canonical?.remove();}else ensureCanonical(`https://gasisalud.com${pathname==='/'?'':pathname}`);
  window.scrollTo({top:0,behavior:'auto'});
 },[pathname]);
 return null;
}
