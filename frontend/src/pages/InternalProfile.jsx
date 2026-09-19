import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Building2, IdCard, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';

const backendProfileEnabled = () => process.env.REACT_APP_INTERNAL_SYNTHETIC_API === 'true';
const backendBaseUrl = () => String(process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');

export default function InternalProfile() {
  const { session, isMaster, canManageWorkers } = useInternalPrototypeAuth();
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('idle');

  useEffect(() => {
    let mounted = true;
    if (!session) return () => { mounted = false; };
    if (!backendProfileEnabled()) {
      setProfile(session);
      setProfileState('local-demo');
      return () => { mounted = false; };
    }
    const baseUrl = backendBaseUrl();
    if (!baseUrl) {
      setProfile(null);
      setProfileState('blocked');
      return () => { mounted = false; };
    }
    setProfile(null);
    setProfileState('loading');
    fetch(`${baseUrl}/api/internal-prototype/profile`, {
      method: 'GET',
      headers: { 'X-Demo-Actor-Id': session.id },
      cache: 'no-store',
    }).then(async (response) => {
      if (!mounted) return;
      if (!response.ok) {
        setProfileState('blocked');
        return;
      }
      const authoritative = await response.json();
      if (!mounted) return;
      setProfile(authoritative);
      setProfileState('authoritative');
    }).catch(() => {
      if (mounted) setProfileState('blocked');
    });
    return () => { mounted = false; };
  }, [session]);

  if (!session) return null;
  const visible = profile;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="internal-profile">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 mb-6">
          <p className="font-semibold text-amber-200">PROTOTIPO · PERFIL PROFESIONAL SINTÉTICO</p>
          <p className="text-sm text-amber-100/80 mt-1">Solo muestra datos mínimos necesarios para probar identidad, rol y ámbito de acceso. No contiene documentación profesional real.</p>
        </div>

        <header className="mb-7">
          <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold mb-2"><ShieldCheck className="w-4 h-4" /> GASI · Zona interna</div>
          <h1 className="text-3xl font-bold">Mi perfil</h1>
          <p className="text-slate-400 mt-2">Identidad individual y alcance operativo del prototipo.</p>
          <p className="text-xs text-slate-500 mt-2">Fuente: {profileState === 'authoritative' ? 'backend sintético autoritativo' : profileState === 'local-demo' ? 'maqueta local sintética' : 'validación pendiente/bloqueada'}.</p>
        </header>

        {profileState === 'loading' && <div role="status" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-cyan-100">Cargando perfil desde la autoridad sintética…</div>}
        {profileState === 'blocked' && <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-100">No se ha podido validar el perfil con la autoridad sintética. Los datos locales no se muestran como sustituto.</div>}

        {visible && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-cyan-400/10 p-3"><UserRound className="w-6 h-6 text-cyan-300" /></div>
            <div><p className="text-sm text-slate-500">Nombre sintético</p><p className="text-xl font-semibold">{visible.displayName}</p></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500 flex items-center gap-2"><IdCard className="w-4 h-4" /> Identificador</p><p className="mt-2 font-medium break-all">{visible.id}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500 flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> Rol</p><p className="mt-2 font-medium">{visible.roleLabel}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500 flex items-center gap-2"><LockKeyhole className="w-4 h-4" /> Estado de acceso</p><p className="mt-2 font-medium">{visible.status}</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-500">Estado operativo</p><p className="mt-2 font-medium">{visible.operationalStatus}</p></div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-500 flex items-center gap-2"><Building2 className="w-4 h-4" /> Centros/contextos asignados</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(visible.centers || []).length > 0 ? visible.centers.map((center) => <span key={center} className="rounded-full border border-slate-700 px-3 py-1 text-sm">{center}</span>) : <span className="text-slate-400">Sin centro clínico asignado.</span>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
            Titulación, colegiación, seguros, disponibilidad y documentación profesional real no se muestran ni se inventan en este prototipo. Esos campos solo podrán incorporarse cuando exista una fuente operativa autorizada y su necesidad esté validada.
          </div>
        </section>}

        <nav className="mt-6 flex flex-wrap gap-3">
          <Link to="/interno/prototipo-clinico" className="rounded-lg bg-cyan-400 text-slate-950 font-semibold px-4 py-2">Ir al canal clínico</Link>
          {session.role === 'nurse' && <Link to="/interno/prototipo-clinico/nuevo" className="rounded-lg border border-cyan-400/60 px-4 py-2 text-cyan-100">Abrir caso sintético</Link>}
          {session.role !== 'admin' && <Link to="/interno/fichaje" className="rounded-lg border border-slate-700 px-4 py-2">Fichaje</Link>}\n          {canManageWorkers && <Link to="/interno/trabajadores" className="rounded-lg border border-slate-700 px-4 py-2">Gestionar trabajadores</Link>}\n          {isMaster && <Link to="/interno/puestos" className="rounded-lg border border-slate-700 px-4 py-2">Gestionar puestos</Link>}
          {isMaster && <Link to="/interno/fichajes" className="rounded-lg border border-slate-700 px-4 py-2">Control de fichajes</Link>}
        </nav>
      </div>
    </main>
  );
}
