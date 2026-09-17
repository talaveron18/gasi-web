import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { interpretSessionAuthority } from '@/lib/internalSessionAuthority';

const InternalAuthContext = createContext(null);
const MASTER_ID = 'USR-DEMO-ADMIN-01';
const ROLE_LABELS = { nurse: 'Enfermería', physician: 'Facultativo', psychologist: 'Psicología', physiotherapist: 'Fisioterapia', admin: 'Administración / Coordinación' };
const INITIAL_IDENTITIES = [
  ['USR-DEMO-NURSE-01', 'Enfermera Demo 01', 'nurse', ['Centro ficticio Madrid 01']],
  ['USR-DEMO-PHYS-01', 'Dr. Demo 01', 'physician', ['Centro ficticio Madrid 01']],
  ['USR-DEMO-PSY-01', 'Psicóloga Demo 01', 'psychologist', ['Centro ficticio Madrid 01']],
  ['USR-DEMO-PHYSIO-01', 'Fisioterapeuta Demo 01', 'physiotherapist', ['Centro ficticio Madrid 01']],
  [MASTER_ID, 'Coordinación Demo 01', 'admin', []],
].map(([id, displayName, role, centers]) => ({ id, displayName, role, roleLabel: ROLE_LABELS[role], centers, status: 'ACTIVE', operationalStatus: 'DEMO_READY', delegatedPrivileges: [] }));

const centralEnabled = () => process.env.REACT_APP_INTERNAL_SYNTHETIC_API === 'true';
const apiRoot = () => String(process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const now = () => new Date().toISOString();
const mapWorker = (worker) => ({ id: worker.id, displayName: worker.display_name, role: worker.role, roleLabel: ROLE_LABELS[worker.role] || worker.role, centers: worker.centers || [], status: worker.active === false ? 'REVOKED' : 'ACTIVE', operationalStatus: 'DEMO_BACKEND_CONFIRMED', delegatedPrivileges: worker.delegated_privileges || [] });

export function InternalPrototypeAuthProvider({ children }) {
  const [identities, setIdentities] = useState(INITIAL_IDENTITIES);
  const [session, setSession] = useState(null);
  const [lastError, setLastError] = useState('');
  const [sessionChecking, setSessionChecking] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [accessAudit, setAccessAudit] = useState([]);
  const appendAudit = useCallback((event) => setAccessAudit((items) => [...items, { id: `AUD-${Date.now()}-${Math.random()}`, at: now(), ...event }]), []);

  const refreshDirectory = useCallback(async (actor) => {
    const authority = actor || session;
    if (!centralEnabled()) return { ok: true };
    if (!authority || !(authority.role === 'admin' || authority.delegatedPrivileges?.includes('worker_access_management'))) return { ok: false, error: 'Sin permiso para gestionar trabajadores.' };
    setDirectoryLoading(true);
    try {
      const response = await fetch(`${apiRoot()}/api/internal-prototype/workers`, { headers: { 'X-Demo-Actor-Id': authority.id }, cache: 'no-store' });
      if (!response.ok) return { ok: false, error: `Directorio rechazado (HTTP ${response.status}).` };
      setIdentities((await response.json()).map(mapWorker));
      return { ok: true };
    } catch (_error) {
      return { ok: false, error: 'Backend no disponible.' };
    } finally { setDirectoryLoading(false); }
  }, [session]);

  const validateSession = useCallback(async (candidate) => {
    if (!centralEnabled()) return candidate?.status === 'ACTIVE';
    setSessionChecking(true);
    try {
      const response = await fetch(`${apiRoot()}/api/internal-prototype/session`, { headers: { 'X-Demo-Actor-Id': candidate.id }, cache: 'no-store' });
      const authoritative = response.ok ? await response.json() : null;
      const outcome = interpretSessionAuthority({ candidate, httpStatus: response.status, authoritative });
      if (!outcome.ok) { setLastError(outcome.message); return false; }
      return true;
    } catch (_error) { setLastError('Backend de identidad no disponible.'); return false; }
    finally { setSessionChecking(false); }
  }, []);

  const signInSynthetic = async (id) => {
    const identity = identities.find((item) => item.id === id);
    if (!identity || identity.status !== 'ACTIVE') return false;
    const nextSession = { ...identity, signedInAt: now(), prototypeOnly: true };
    if (!(await validateSession(nextSession))) return false;
    setSession(nextSession); return true;
  };
  const signOut = () => setSession(null);

  useEffect(() => {
    if (session && centralEnabled() && (session.role === 'admin' || session.delegatedPrivileges?.includes('worker_access_management'))) refreshDirectory(session);
  }, [session?.id, session?.role, session?.delegatedPrivileges, refreshDirectory]);

  const grantPrivilege = async (id, privilege, grant = true) => {
    if (session?.id !== MASTER_ID) return { ok: false, error: 'Solo la cuenta maestra puede cambiar privilegios.' };
    if (id === MASTER_ID) return { ok: false, error: 'Los privilegios de la cuenta maestra son intrínsecos.' };
    try {
      const response = await fetch(`${apiRoot()}/api/internal-prototype/workers/${encodeURIComponent(id)}/privileges/${grant ? 'grant' : 'revoke'}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Actor-Id': session.id }, body: JSON.stringify({ privilege, reason: 'Delegación DEMO desde panel maestro' }) });
      if (!response.ok) return { ok: false, error: `Backend rechazó el privilegio (HTTP ${response.status}).` };
      const synced = await refreshDirectory(session); if (!synced.ok) return synced;
      appendAudit({ actorId: session.id, actor: session.displayName, action: grant ? 'PRIVILEGE_GRANTED' : 'PRIVILEGE_REVOKED', targetId: id, detail: privilege });
      return { ok: true };
    } catch (_error) { return { ok: false, error: 'No se pudo confirmar el privilegio.' }; }
  };

  const addSyntheticIdentity = async ({ displayName, role, centers }) => {
    if (!(session?.role === 'admin' || session?.delegatedPrivileges?.includes('worker_access_management'))) return { ok: false, error: 'Sin permiso de gestión.' };
    const id = `USR-DEMO-${role.toUpperCase()}-${Date.now()}`;
    try {
      const response = await fetch(`${apiRoot()}/api/internal-prototype/workers`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Actor-Id': session.id }, body: JSON.stringify({ id, display_name: displayName, role, centers }) });
      if (!response.ok) return { ok: false, error: `Backend rechazó el alta (HTTP ${response.status}).` };
      const created = mapWorker(await response.json()); await refreshDirectory(session); return { ok: true, identity: created };
    } catch (_error) { return { ok: false, error: 'Alta no confirmada.' }; }
  };

  const setIdentityStatus = async (id, state) => {
    try {
      const response = await fetch(`${apiRoot()}/api/internal-prototype/workers/${encodeURIComponent(id)}/access`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Actor-Id': session.id }, body: JSON.stringify({ state }) });
      if (!response.ok) return { ok: false, error: `Backend rechazó el cambio (HTTP ${response.status}).` };
      await refreshDirectory(session); return { ok: true };
    } catch (_error) { return { ok: false, error: 'Cambio no confirmado.' }; }
  };

  const value = { session, identities, accessAudit, lastError, sessionChecking, directoryLoading, signInSynthetic, signOut, validateSession, refreshDirectory, addSyntheticIdentity, setIdentityStatus, grantPrivilege, isAuthenticated: Boolean(session), centralValidationEnabled: centralEnabled(), isMaster: session?.id === MASTER_ID };
  return <InternalAuthContext.Provider value={value}>{children}</InternalAuthContext.Provider>;
}

export function useInternalPrototypeAuth() {
  const value = useContext(InternalAuthContext);
  if (!value) throw new Error('provider required');
  return value;
}
