import React, { createContext, useContext, useState } from 'react';

const InternalPrototypeAuthContext = createContext(null);

const INITIAL_IDENTITIES = [
  {
    id: 'USR-DEMO-NURSE-01',
    displayName: 'Enfermera Demo 01',
    role: 'nurse',
    roleLabel: 'Enfermería',
    centers: ['Centro ficticio Madrid 01'],
    status: 'ACTIVE',
    operationalStatus: 'DEMO_READY',
  },
  {
    id: 'USR-DEMO-PHYS-01',
    displayName: 'Dr. Demo 01',
    role: 'physician',
    roleLabel: 'Facultativo',
    centers: ['Centro ficticio Madrid 01'],
    status: 'ACTIVE',
    operationalStatus: 'DEMO_READY',
  },
  {
    id: 'USR-DEMO-ADMIN-01',
    displayName: 'Coordinación Demo 01',
    role: 'admin',
    roleLabel: 'Administración / Coordinación',
    centers: ['Centro ficticio Madrid 01'],
    status: 'ACTIVE',
    operationalStatus: 'DEMO_READY',
  },
  {
    id: 'USR-DEMO-REVOKED-01',
    displayName: 'Profesional Revocado Demo',
    role: 'nurse',
    roleLabel: 'Enfermería',
    centers: ['Centro ficticio Madrid 01'],
    status: 'REVOKED',
    operationalStatus: 'INACTIVE',
  },
];

const ROLE_LABELS = {
  nurse: 'Enfermería',
  physician: 'Facultativo',
  admin: 'Administración / Coordinación',
};

const timestamp = () => new Date().toISOString();

export function InternalPrototypeAuthProvider({ children }) {
  const [identities, setIdentities] = useState(INITIAL_IDENTITIES);
  const [session, setSession] = useState(null);
  const [lastError, setLastError] = useState('');
  const [accessAudit, setAccessAudit] = useState([
    {
      id: 'AUD-DEMO-BOOT',
      at: '2026-09-12T12:00:00.000Z',
      actorId: 'SYSTEM-DEMO',
      actor: 'Sistema sintético',
      action: 'PROTOTYPE_INITIALIZED',
      targetId: null,
      detail: 'Registro sintético inicial. Sin datos reales.',
    },
  ]);

  const appendAudit = (entry) => {
    setAccessAudit((current) => [...current, {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: timestamp(),
      ...entry,
    }]);
  };

  const signInSynthetic = (identityId) => {
    const identity = identities.find((item) => item.id === identityId);
    if (!identity) {
      setLastError('Identidad sintética no encontrada.');
      appendAudit({ actorId: identityId || 'UNKNOWN', actor: 'Desconocido', action: 'LOGIN_DENIED', targetId: identityId || null, detail: 'Identidad no encontrada.' });
      return false;
    }
    if (identity.status !== 'ACTIVE') {
      setSession(null);
      setLastError('Acceso revocado: esta identidad no puede iniciar sesión.');
      appendAudit({ actorId: identity.id, actor: identity.displayName, action: 'LOGIN_DENIED_REVOKED', targetId: identity.id, detail: 'Intento de acceso con identidad revocada.' });
      return false;
    }

    const nextSession = { ...identity, signedInAt: timestamp(), prototypeOnly: true };
    setSession(nextSession);
    setLastError('');
    appendAudit({ actorId: identity.id, actor: identity.displayName, action: 'LOGIN_SUCCESS', targetId: identity.id, detail: `Acceso sintético como ${identity.roleLabel}.` });
    return true;
  };

  const signOut = () => {
    if (session) appendAudit({ actorId: session.id, actor: session.displayName, action: 'LOGOUT', targetId: session.id, detail: 'Cierre de sesión sintética.' });
    setSession(null);
    setLastError('');
  };

  const addSyntheticIdentity = ({ displayName, role, centers }) => {
    if (session?.role !== 'admin') return { ok: false, error: 'Acción reservada a Administración / Coordinación.' };
    const cleanName = String(displayName || '').trim();
    const cleanCenters = Array.isArray(centers) ? centers.map((item) => String(item).trim()).filter(Boolean) : [];
    if (!cleanName || !ROLE_LABELS[role] || cleanCenters.length === 0) return { ok: false, error: 'Nombre, rol y al menos un centro/contexto son obligatorios.' };

    const identity = {
      id: `USR-DEMO-${role.toUpperCase()}-${Date.now()}`,
      displayName: cleanName,
      role,
      roleLabel: ROLE_LABELS[role],
      centers: cleanCenters,
      status: 'ACTIVE',
      operationalStatus: 'DEMO_PENDING_VALIDATION',
    };
    setIdentities((current) => [...current, identity]);
    appendAudit({ actorId: session.id, actor: session.displayName, action: 'IDENTITY_CREATED', targetId: identity.id, detail: `Alta sintética ${identity.roleLabel}.` });
    return { ok: true, identity };
  };

  const setIdentityStatus = (identityId, status) => {
    if (session?.role !== 'admin') return { ok: false, error: 'Acción reservada a Administración / Coordinación.' };
    if (!['ACTIVE', 'REVOKED'].includes(status)) return { ok: false, error: 'Estado no permitido.' };
    const target = identities.find((item) => item.id === identityId);
    if (!target) return { ok: false, error: 'Identidad no encontrada.' };
    if (target.id === session.id && status === 'REVOKED') return { ok: false, error: 'El administrador activo no puede revocar su propia sesión desde este prototipo.' };

    setIdentities((current) => current.map((item) => item.id === identityId ? { ...item, status, operationalStatus: status === 'ACTIVE' ? 'DEMO_PENDING_VALIDATION' : 'INACTIVE' } : item));
    appendAudit({ actorId: session.id, actor: session.displayName, action: status === 'ACTIVE' ? 'IDENTITY_REACTIVATED' : 'IDENTITY_REVOKED', targetId: identityId, detail: `${target.displayName} → ${status}.` });
    return { ok: true };
  };

  const value = {
    session,
    identities,
    accessAudit,
    lastError,
    signInSynthetic,
    signOut,
    addSyntheticIdentity,
    setIdentityStatus,
    isAuthenticated: Boolean(session),
  };

  return (
    <InternalPrototypeAuthContext.Provider value={value}>
      {children}
    </InternalPrototypeAuthContext.Provider>
  );
}

export function useInternalPrototypeAuth() {
  const value = useContext(InternalPrototypeAuthContext);
  if (!value) throw new Error('useInternalPrototypeAuth must be used inside InternalPrototypeAuthProvider');
  return value;
}
