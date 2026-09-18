import React from'react';
import{Link}from'react-router-dom';

export default function PoliticaCookies(){
 return <div>
  <section className="bg-slate-950 text-white py-16"><div className="max-w-4xl mx-auto px-6"><p className="text-cyan-300 uppercase tracking-wide text-sm font-semibold">Privacidad</p><h1 className="text-4xl lg:text-5xl font-bold mt-2">Política de cookies</h1><p className="text-slate-300 mt-4">Qué tecnologías de almacenamiento utiliza actualmente esta web.</p></div></section>
  <main className="max-w-4xl mx-auto px-6 py-14 prose prose-slate prose-lg">
   <p><strong>Última actualización:</strong> 18 de septiembre de 2026.</p>
   <h2>Situación actual</h2>
   <p>La versión actual de la web pública de GASI no utiliza herramientas de analítica publicitaria, seguimiento entre sitios ni grabación de sesiones.</p>
   <h2>Tecnologías necesarias</h2>
   <p>Determinadas funciones pueden utilizar almacenamiento técnico estrictamente necesario para mantener una sesión solicitada por el usuario o para proteger una función de la zona profesional. Estas tecnologías no se utilizan para publicidad comportamental.</p>
   <h2>Zona profesional</h2>
   <p>La zona profesional puede utilizar credenciales técnicas de sesión y, en el caso del control horario, una credencial segura del PC fijo autorizado del centro. Son necesarias para autenticar y proteger el acceso, no para seguimiento comercial.</p>
   <h2>Servicios de terceros</h2>
   <p>Los enlaces externos, como WhatsApp, solo se cargan cuando el usuario decide acceder a ellos. A partir de ese momento se aplican las políticas del proveedor externo.</p>
   <h2>Cambios futuros</h2>
   <p>Si se incorpora analítica, publicidad u otra tecnología no estrictamente necesaria, esta política y el mecanismo de consentimiento deberán actualizarse antes de su activación.</p>
   <p>Puede consultar también la <Link to="/politica-privacidad">política de protección de datos</Link>.</p>
  </main>
 </div>;
}
