import React, { createContext, useCallback, useContext, useState } from 'react';
import { interpretSessionAuthority } from '@/lib/internalSessionAuthority';

const InternalPrototypeAuthContext = createContext(null);

const INITIAL_IDENTITIES = [
  { id: 'USR-DEMO-NURSE-01', displayName: 'Enfermera Demo 01', role: 'nurse', roleLabel: 'Enfermería', centers: ['Centro ficticio Madrid 01'], status: 'ACTIVE', operationalStatus: 'DEMO_READY' },
  { id: 'USR-DEMO-PHYS-01', displayName: 'Dr. Demo 01', role: 'physician', roleLabel: 'Facultativo', centers: ['Centro ficticio Madrid 01'], status: 'ACTIVE', operationalStatus: 'DEMO_READY' },
  { id: 'USR-DEMO-PSYCH-01', displayName: 'Psicología Demo 01', role: 'psychologist', roleLabel: 'Psicología', centers: ['Centro ficticio Madrid 01'], status: 'ACTIVE', operationalStatus: 'DEMO_READY' },
  { id: 'USR-DEMO-PHYSIO-01', displayName: 'Fisioterapia Demo 01', role: 'physiotherapist', roleLabel: 'Fisioterapia', centers: ['Centro ficticio Madrid 01'], status: 'ACTIVE', operationalStatus: 'DEMO_READY' },
  { id: 'USR-DEMO-ADMIN-01', displayName: 'Coordinación Demo 01', role: 'admin', roleLabel: 'Administración / Coordinación', centers: [], status: 'ACTIVE', operationalStatus: 'DEMO_READY' },
  { id: 'USR-DEMO-REVOKED-01', displayName: 'Profesional Revocado Demo', role: 'nurse', roleLabel: 'Enfermería', centers: ['Centro ficticio Madrid 01'], status: 'REVOKED', operationalStatus: 'INACTIVE' },
];

const ROLE_LABELS = { nurse: 'Enfermería', physician: 'Facultativo', psychologist: 'Psicología', physiotherapist: 'Fisioterapia', admin: 'Administración / Coordinación' };
const timestamp = () => new Date().toISOString();
const backendSessionValidationEnabled = () => process.env.REACT_APP_INTERNAL_SYNTHETIC_API === 'true';
const backendBaseUrl = () => String(process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');

export function InternalPrototypeAuthProvider({ children }) {
  const [identities, setIdentities] = useState(INITIAL_IDENTITIES);
  const [session, setSession] = useState(null);
  const [lastError, setLastError] = useState('');
  const [sessionChecking, setSessionChecking] = useState(false);
  const [accessAudit, setAccessAudit] = useState([{ id: 'AUD-DEMO-BOOT', at: '2026-09-12T12:00:00.000Z', actorId: 'SYSTEM-DEMO', actor: 'Sistema sintético', action: 'PROTOTYPE_INITIALIZED', targetId: null, detail: 'Registro sintético inicial. Sin datos reales.' }]);

  const appendAudit = useCallback((entry) => {
    setAccessAudit((current) => [...current, { id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: timestamp(), ...entry }]);
  }, []);

  const validateSession = useCallback(async (candidate) => {
    if (!candidate) return false;
    if (!backendSessionValidationEnabled()) return candidate.status === 'ACTIVE';
    const baseUrl = backendBaseUrl();
    if (!baseUrl) { setSession(null); setLastError('Validación central activada sin URL de backend configurada. Acceso bloqueado de forma segura.'); return false; }
    setSessionChecking(true);
    try {
      const response = await fetch(`${baseUrl}/api/internal-prototype/session`, { method: 'GET', headers: { 'X-Demo-Actor-Id': candidate.id }, cache: 'no-store' });
      let authoritative = null;
      if (response.ok) authoritative = await response.json();
      const outcome = interpretSessionAuthority({ candidate, httpStatus: response.status, authoritative });
      if (!outcome.ok) { setSession(null); setLastError(outcome.message); appendAudit({ actorId: candidate.id, actor: candidate.displayName, action: outcome.code === 'MISMATCH' ? 'SESSION_IDENTITY_MISMATCH' : 'SESSION_VALIDATION_DENIED', targetId: candidate.id, detail: `Autoridad central: ${outcome.code}; HTTP ${response.status}.` }); return false; }
      setSession((current) => current ? { ...current, centers: outcome.centers, status: 'ACTIVE', centrallyValidatedAt: timestamp() } : current);
      setLastError('');
      return true;
    } catch {
      const outcome = interpretSessionAuthority({ candidate, networkError: true });
      setSession(null); setLastError(outcome.message); appendAudit({ actorId: candidate.id, actor: candidate.displayName, action: 'SESSION_VALIDATION_UNAVAILABLE', targetId: candidate.id, detail: 'Fallo de comunicación con backend sintético.' }); return false;
    } finally { setSessionChecking(false); }
  }, [appendAudit]);

  const signInSynthetic = async (identityId) => {
    const identity = identities.find((item) => item.id === identityId);
    if (!identity) { setLastError('Identidad sintética no encontrada.'); appendAudit({ actorId: identityId || 'UNKNOWN', actor: 'Desconocido', action: 'LOGIN_DENIED', targetId: identityId || null, detail: 'Identidad no encontrada.' }); return false; }
    if (identity.status !== 'ACTIVE') { setSession(null); setLastError('Acceso revocado: esta identidad no puede iniciar sesión.'); appendAudit({ actorId: identity.id, actor: identity.displayName, action: 'LOGIN_DENIED_REVOKED', targetId: identity.id, detail: 'Intento de acceso con identidad revocada.' }); return false; }
    const nextSession = { ...identity, signedInAt: timestamp(), prototypeOnly: true };
    if (backendSessionValidationEnabled() && !(await validateSession(nextSession))) return false;
    setSession(nextSession); setLastError(''); appendAudit({ actorId: identity.id, actor: identity.displayName, action: 'LOGIN_SUCCESS', targetId: identity.id, detail: `Acceso sintético como ${identity.roleLabel}.` }); return true;
  };

  const signOut = () => { if (session) appendAudit({ actorId: session.id, actor: session.displayName, action: 'LOGOUT', targetId: session.id, detail: 'Cierre de sesión sintética.' }); setSession(null); setLastError(''); };

  const addSyntheticIdentity = async ({ displayName, role, centers }) => {
    if (session?.role !== 'admin') return { ok: false, error: 'Acción reservada a Administración / Coordinación.' };
    const cleanName = String(displayName || '').trim();
    const cleanCenters = Array.isArray(centers) ? centers.map((item) => String(item).trim()).filter(Boolean) : [];
    if (!cleanName || !ROLE_LABELS[role]) return { ok: false, error: 'Nombre y rol son obligatorios.' };
    if (role !== 'admin' && cleanCenters.length === 0) return { ok: false, error: 'Los perfiles clínicos requieren al menos un centro/contexto.' };
    if (role === 'admin' && cleanCenters.length > 0) return { ok: false, error: 'Administración / Coordinación no recibe ámbito clínico por centro.' };

    const identityId = `USR-DEMO-${role.toUpperCase()}-${Date.now()}`;
    let identity = { id: identityId, displayName: cleanName, role, roleLabel: ROLE_LABELS[role], centers: cleanCenters, status: 'ACTIVE', operationalStatus: 'DEMO_PENDING_VALIDATION' };

    if (backendSessionValidationEnabled()) {
      const baseUrl = backendBaseUrl();
      if (!baseUrl) return { ok: false, error: 'Backend sintético no configurado; alta bloqueada de forma segura.' };
      try {
        const response = await fetch(`${baseUrl}/api/internal-prototype/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Demo-Actor-Id': session.id },
          body: JSON.stringify({ id: identityId, display_name: cleanName, role, centers: cleanCenters }),
        });
        if (!response.ok) {
          let detail = '';
          try { detail = (await response.json())?.detail || ''; } catch { detail = ''; }
          return { ok: false, error: `El backend sintético rechazó el alta${detail ? `: ${detail}` : ` (HTTP ${response.status})`}.` };
        }
        const authoritative = await response.json();
        identity = { id: authoritative.id, displayName: authoritative.display_name, role: authoritative.role, roleLabel: ROLE_LABELS[authoritative.role], centers: authoritative.centers || [], status: authoritative.operational_state || 'ACTIVE', operationalStatus: 'DEMO_BACKEND_CONFIRMED' };
      } catch {
        return { ok: false, error: 'No se pudo confirmar el alta con el backend sintético; no se crea una identidad local huérfana.' };
      }
    }

    setIdentities((current) => [...current, identity]);
    appendAudit({ actorId: session.id, actor: session.displayName, action: 'IDENTITY_CREATED', targetId: identity.id, detail: `Alta sintética ${identity.roleLabel}${backendSessionValidationEnabled() ? ' confirmada por backend.' : '.'}` });
    return { ok: true, identity };
  };

  const setIdentityStatus = async (identityId, status) => {
    if (session?.role !== 'admin') return { ok: false, error: 'Acción reservada a Administración / Coordinación.' };
    if (!['ACTIVE', 'REVOKED'].includes(status)) return { ok: false, error: 'Estado no permitido.' };
    const target = identities.find((item) => item.id === identityId);
    if (!target) return { ok: false, error: 'Identidad no encontrada.' };
    if (target.id === session.id && status === 'REVOKED') return { ok: false, error: 'El administrador activo no puede revocar su propia sesión desde este prototipo.' };
    if (backendSessionValidationEnabled()) {
      const baseUrl = backendBaseUrl();
      if (!baseUrl) return { ok: false, error: 'Backend sintético no configurado; cambio bloqueado.' };
      try {
        const response = await fetch(`${baseUrl}/api/internal-prototype/workers/${encodeURIComponent(identityId)}/access`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Actor-Id': session.id }, body: JSON.stringify({ state: status }) });
        if (!response.ok) return { ok: false, error: `El backend sintético rechazó el cambio (HTTP ${response.status}).` };
      } catch { return { ok: false, error: 'No se pudo confirmar el cambio con el backend sintético; no se modifica el estado local.' }; }
    }
    setIdentities((current) => current.map((item) => item.id === identityId ? { ...item, status, operationalStatus: status === 'ACTIVE' ? 'DEMO_PENDING_VALIDATION' : 'INACTIVE' } : item));
    appendAudit({ actorId: session.id, actor: session.displayName, action: status === 'ACTIVE' ? 'IDENTITY_REACTIVATED' : 'IDENTITY_REVOKED', targetId: identityId, detail: `${target.displayName} → ${status}.` });
    return { ok: true };
  };

  const value = { session, identities, accessAudit, lastError, sessionChecking, signInSynthetic, signOut, validateSession, addSyntheticIdentity, setIdentityStatus, isAuthenticated: Boolean(session), centralValidationEnabled: backendSessionValidationEnabled() };
  return <InternalPrototypeAuthContext.Provider value={value}>{children}</InternalPrototypeAuthContext.Provider>;
}

export function useInternalPrototypeAuth() { const value = useContext(InternalPrototypeAuthContext); if (!value) throw new Error('useInternalPrototypeAuth must be used inside InternalPrototypeAuthProvider'); return value; }
