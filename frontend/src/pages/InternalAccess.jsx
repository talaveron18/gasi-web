import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, HeartPulse, IdCard, LockKeyhole, LogOut, ShieldCheck, Stethoscope, UserCog, UserX } from 'lucide-react';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';

const ROLE_ICON = {
  nurse: HeartPulse,
  physician: Stethoscope,
  admin: UserCog,
};

export default function InternalAccess() {
  const navigate = useNavigate();
  const { identities, session, lastError, sessionChecking, centralValidationEnabled, signInSynthetic, signOut } = useInternalPrototypeAuth();
  const activeIdentities = useMemo(() => identities.filter((item) => item.status === 'ACTIVE'), [identities]);
  const revokedIdentities = useMemo(() => identities.filter((item) => item.status !== 'ACTIVE'), [identities]);

  const signIn = async (identityId) => {
    if (await signInSynthetic(identityId)) navigate('/interno/prototipo-clinico');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="internal-access-prototype">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 mb-6 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-200">PROTOTIPO DE ACCESO · IDENTIDADES SINTÉTICAS</p>
            <p className="text-sm text-amber-100/80">No es autenticación de producción. Sirve para validar navegación, identidad individual, revocación y permisos por rol sin tratar datos reales.</p>
          </div>
        </div>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold mb-2"><ShieldCheck className="w-4 h-4" /> GASI · Zona interna</div>
          <h1 className="text-3xl md:text-4xl font-bold">Acceso de profesionales</h1>
          <p className="text-slate-400 mt-2 max-w-3xl">Cada profesional usa una identidad individual. No existen cuentas compartidas. El prototipo mantiene la sesión solo en memoria y permite probar revocación antes de integrar autenticación fuerte real.</p>
          <p className="text-xs text-slate-500 mt-2">Validación central sintética: {centralValidationEnabled ? 'ACTIVA · fail-closed' : 'DESACTIVADA · modo local de maqueta'}.</p>
        </header>

        {lastError && <div role="alert" className="mb-6 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-100">{lastError}</div>}

        {sessionChecking && <div role="status" className="mb-6 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-cyan-100">Validando identidad sintética contra el backend del prototipo…</div>}

        {session ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-300">Sesión sintética activa</p>
                <h2 className="text-2xl font-bold mt-1">{session.displayName}</h2>
                <p className="text-emerald-100/80 mt-1">{session.roleLabel} · {session.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/interno/prototipo-clinico')} className="rounded-lg bg-emerald-300 text-slate-950 font-semibold px-4 py-2">Entrar al panel</button>
                <button type="button" onClick={() => navigate('/interno/perfil')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/40 px-4 py-2"><IdCard className="w-4 h-4" />Mi perfil</button>
                {session.role === 'admin' && <button type="button" onClick={() => navigate('/interno/trabajadores')} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 text-cyan-100 px-4 py-2"><UserCog className="w-4 h-4" />Trabajadores y accesos</button>}
                <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/40 px-4 py-2"><LogOut className="w-4 h-4" />Cerrar sesión</button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid md:grid-cols-3 gap-4 mb-8">
          {activeIdentities.map((identity) => {
            const Icon = ROLE_ICON[identity.role];
            return (
              <article key={identity.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Icon className="w-7 h-7 text-cyan-300" />
                  <span className="inline-flex items-center gap-1 text-xs rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200"><BadgeCheck className="w-3.5 h-3.5" />ACTIVA</span>
                </div>
                <h2 className="text-lg font-bold mt-4">{identity.displayName}</h2>
                <p className="text-sm text-slate-400 mt-1">{identity.roleLabel}</p>
                <dl className="mt-4 text-sm space-y-2">
                  <div><dt className="text-slate-500">Identidad</dt><dd className="font-mono text-slate-300">{identity.id}</dd></div>
                  <div><dt className="text-slate-500">Centro/contexto asignado</dt><dd className="text-slate-300">{identity.centers.join(', ')}</dd></div>
                </dl>
                <button disabled={sessionChecking} type="button" onClick={() => signIn(identity.id)} className="mt-5 w-full rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold px-4 py-2">Simular acceso individual</button>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2"><UserX className="w-5 h-5 text-rose-300" />Revocación y baja</h2>
          <p className="text-slate-400 mt-2">Una identidad revocada queda fuera del acceso. Con validación central sintética activa, un rechazo o indisponibilidad del backend cierra el acceso en vez de reutilizar la sesión local.</p>
          <div className="mt-4 space-y-3">
            {revokedIdentities.map((identity) => (
              <div key={identity.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div><p className="font-semibold">{identity.displayName}</p><p className="text-sm text-slate-500">{identity.roleLabel} · {identity.id}</p></div>
                <button disabled={sessionChecking} type="button" onClick={() => signIn(identity.id)} className="rounded-lg border border-rose-400/40 disabled:opacity-50 text-rose-200 px-3 py-2 text-sm">Probar bloqueo</button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><LockKeyhole className="w-5 h-5 text-cyan-300" /><p className="font-semibold mt-2">Sesión segura</p><p className="text-sm text-slate-500 mt-1">La versión real deberá usar autenticación fuerte, sesiones seguras, expiración y revocación central.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><ShieldCheck className="w-5 h-5 text-cyan-300" /><p className="font-semibold mt-2">Mínimo privilegio</p><p className="text-sm text-slate-500 mt-1">Enfermería, facultativo y coordinación reciben interfaces y acciones distintas.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><UserCog className="w-5 h-5 text-cyan-300" /><p className="font-semibold mt-2">Altas y bajas</p><p className="text-sm text-slate-500 mt-1">Coordinación puede probar altas, revocación y reactivación sintéticas; la gestión real requerirá backend autorizado.</p></div>
        </section>
      </div>
    </main>
  );
}
