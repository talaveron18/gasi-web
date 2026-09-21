import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GraduationCap, Stethoscope, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';

export default function AccessPortal() {
  const { user, loading } = useAuth();
  const { isAuthenticated, session, sessionChecking } = useInternalPrototypeAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;
  if (!sessionChecking && isAuthenticated && !session?.mustChangePassword) return <Navigate to="/interno/clinica" replace />;

  return (
    <main className="min-h-screen bg-slate-50 py-16 text-slate-900" data-testid="access-portal">
      <div className="mx-auto max-w-4xl px-6">
        <header className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#005EB8]">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            GASI
          </div>
          <h1 className="mt-3 text-4xl font-bold">Acceder</h1>
          <p className="mt-3 text-lg text-slate-600">
            Elige el espacio al que necesitas entrar. Cada acceso utiliza su propia identidad y permisos.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <GraduationCap className="h-8 w-8 text-[#005EB8]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">Alumnado</h2>
            <p className="mt-2 text-slate-600">
              Accede a tus cursos, progreso y materiales de formación.
            </p>
            <Link
              to="/formacion-sanitaria"
              state={{ openAuth: true }}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white hover:bg-[#004a92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] focus-visible:ring-offset-2"
              data-testid="access-student"
            >
              Entrar al aula
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Stethoscope className="h-8 w-8 text-[#005EB8]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">Equipo GASI</h2>
            <p className="mt-2 text-slate-600">
              Acceso para profesionales, coordinación y administración autorizados.
            </p>
            <Link
              to="/interno/acceso"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#005EB8] px-4 py-3 font-semibold text-[#005EB8] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] focus-visible:ring-offset-2"
              data-testid="access-team"
            >
              Entrar al área de equipo
            </Link>
          </section>
        </div>

        {(loading || sessionChecking) && (
          <p role="status" aria-live="polite" className="mt-6 text-center text-sm text-slate-500">
            Comprobando si ya tienes una sesión activa…
          </p>
        )}
      </div>
    </main>
  );
}
