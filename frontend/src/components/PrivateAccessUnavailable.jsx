import React from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';

export default function PrivateAccessUnavailable({ area = 'equipo' }) {
  const student = area === 'alumnado';
  return <section className="min-h-[70vh] bg-slate-50 px-5 py-16 text-slate-900" data-testid="private-access-unavailable" aria-labelledby="access-unavailable-title">
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
      <div className="flex items-center gap-3 text-[#005EB8]">
        {student ? <LockKeyhole aria-hidden="true" className="h-8 w-8" /> : <ShieldCheck aria-hidden="true" className="h-8 w-8" />}
        <span className="text-sm font-semibold uppercase tracking-wide">GASI · Acceso restringido</span>
      </div>
      <h1 id="access-unavailable-title" className="mt-5 text-3xl font-bold">{student ? 'Acceso al aula' : 'Acceso al equipo GASI'}</h1>
      <p className="mt-4 text-lg text-slate-700">El acceso {student ? 'del alumnado' : 'del personal autorizado'} todavía no está habilitado en esta web.</p>
      <p className="mt-3 text-slate-600">Por seguridad, no se muestran formularios de contraseña mientras la autenticación privada no esté operativa. Ninguna cuenta puede activarse desde esta página pública.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <a href="mailto:coordinacion@gasisalud.com?subject=Consulta%20de%20acceso%20GASI" className="inline-flex items-center gap-2 rounded-lg bg-[#005EB8] px-5 py-3 font-semibold text-white hover:bg-[#004a92]"><Mail size={18} aria-hidden="true" />Consultar mi acceso</a>
        <Link to="/acceso" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-800"><ArrowLeft size={18} aria-hidden="true" />Volver a accesos</Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">No envíes contraseñas, historias clínicas ni datos de salud por correo o por el asistente público.</p>
    </div>
  </section>;
}
