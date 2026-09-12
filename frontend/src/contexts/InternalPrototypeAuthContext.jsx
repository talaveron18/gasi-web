import React, { createContext, useContext, useMemo, useState } from 'react';

const InternalPrototypeAuthContext = createContext(null);

export const SYNTHETIC_IDENTITIES = [
  {
    id: 'USR-DEMO-NURSE-01',
    displayName: 'Enfermera Demo 01',
    role: 'nurse',
    roleLabel: 'Enfermería',
    centers: ['Centro ficticio Madrid 01'],
    status: 'ACTIVE',
  },
  {
    id: 'USR-DEMO-PHYS-01',
    displayName: 'Dr. Demo 01',
    role: 'physician',
    roleLabel: 'Facultativo',
    centers: ['Cobertura remota ficticia Madrid'],
    status: 'ACTIVE',
  },
  {
    id: 'USR-DEMO-ADMIN-01',
    displayName: 'Coordinación Demo 01',
    role: 'admin',
    roleLabel: 'Administración / Coordinación',
    centers: ['Centro ficticio Madrid 01'],
    status: 'ACTIVE',
  },
  {
    id: 'USR-DEMO-REVOKED-01',
    displayName: 'Profesional Revocado Demo',
    role: 'nurse',
    roleLabel: 'Enfermería',
    centers: ['Centro ficticio Madrid 01'],
    status: 'REVOKED',
  },
];

export function InternalPrototypeAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [lastError, setLastError] = useState('');

  const signInSynthetic = (identityId) => {
    const identity = SYNTHETIC_IDENTITIES.find((item) => item.id === identityId);
    if (!identity) {
      setLastError('Identidad sintética no encontrada.');
      return false;
    }
    if (identity.status !== 'ACTIVE') {
      setSession(null);
      setLastError('Acceso revocado: esta identidad no puede iniciar sesión.');
      return false;
    }

    setSession({
      ...identity,
      signedInAt: new Date().toISOString(),
      prototypeOnly: true,
    });
    setLastError('');
    return true;
  };

  const signOut = () => {
    setSession(null);
    setLastError('');
  };

  const value = useMemo(() => ({
    session,
    identities: SYNTHETIC_IDENTITIES,
    lastError,
    signInSynthetic,
    signOut,
    isAuthenticated: Boolean(session),
  }), [session, lastError]);

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
