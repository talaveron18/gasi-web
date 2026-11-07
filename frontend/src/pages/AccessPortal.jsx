import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Stethoscope, LogIn } from 'lucide-react';
import { STUDENT_PORTAL_ENABLED, INTERNAL_PORTAL_ENABLED } from '@/lib/accessAvailability';

export default function AccessPortal() {
  return (
    <section className="min-h-screen bg-slate-50 py-16 text-slate-900" data-testid="access-portal" aria-labelledby="access-portal-title">
      <div className="mx-auto max-w-4xl px-6">
        <header className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#005EB8]">
            <LogIn className="h-4 w-4" aria-hidden="true" /> GASI
          </div>
          <h1 id="access-portal-title" className="mt-3 text-4xl font-bold">Acceder</h1>
          <p className="mt-3 text-lg text-slate-600">Selecciona el área que necesitas. Los accesos se habilitan individualmente; la zona pública no permite consultar información interna ni clínica.</p>
        </header>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <GraduationCap className="h-8 w-8 text-[#005EB8]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">Alumnado</h2>
            <p className="mt-2 text-slate-600">Acceso separado para alumnado con una cuenta previamente habilitada por GASI. No existe registro público. {STUDENT_PORTAL_ENABLED ? "Acceso habilitado para cuentas autorizadas." : "El aula privada está pendiente de activación."}</p>
            <Link to="/alumnado/acceso" className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#005EB8] px-4 py-3 font-semibold text-[#005EB8] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] focus-visible:ring-offset-2" data-testid="access-student">{STUDENT_PORTAL_ENABLED ? "Entrar al aula" : "Consultar acceso al aula"}</Link>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Stethoscope className="h-8 w-8 text-[#005EB8]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">Equipo GASI</h2>
            <p className="mt-2 text-slate-600">Acceso restringido a profesionales, coordinación y administración previamente autorizados. {INTERNAL_PORTAL_ENABLED ? "Acceso seguro disponible." : "La aplicación interna aún no está conectada a un entorno de autenticación operativo."}</p>
            <Link to="/interno/acceso" className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#005EB8] px-4 py-3 font-semibold text-[#005EB8] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] focus-visible:ring-offset-2" data-testid="access-team">{INTERNAL_PORTAL_ENABLED ? "Entrar al área de equipo" : "Consultar acceso del equipo"}</Link>
          </section>
        </div>
      </div>
    </section>
  );
}
