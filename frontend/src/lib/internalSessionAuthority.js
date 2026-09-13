export const SESSION_AUTHORITY_CODES = {
  OK: 'OK',
  REVOKED: 'REVOKED',
  REJECTED: 'REJECTED',
  MISMATCH: 'MISMATCH',
  UNAVAILABLE: 'UNAVAILABLE',
};

export function interpretSessionAuthority({ candidate, httpStatus, authoritative, networkError = false }) {
  if (!candidate?.id || !candidate?.role) {
    return {
      ok: false,
      code: SESSION_AUTHORITY_CODES.MISMATCH,
      message: 'La identidad local no es válida. Sesión cerrada.',
    };
  }

  if (networkError) {
    return {
      ok: false,
      code: SESSION_AUTHORITY_CODES.UNAVAILABLE,
      message: 'El servicio de validación no está disponible. Acceso bloqueado de forma segura; no se reutiliza la sesión por defecto.',
    };
  }

  if (httpStatus === 401) {
    return {
      ok: false,
      code: SESSION_AUTHORITY_CODES.REVOKED,
      message: 'La identidad ya no está autorizada. La sesión sintética ha sido revocada.',
    };
  }

  if (httpStatus !== 200) {
    return {
      ok: false,
      code: SESSION_AUTHORITY_CODES.REJECTED,
      message: 'No se pudo validar la sesión sintética. Acceso bloqueado de forma segura.',
    };
  }

  if (
    !authoritative?.active
    || authoritative.id !== candidate.id
    || authoritative.role !== candidate.role
  ) {
    return {
      ok: false,
      code: SESSION_AUTHORITY_CODES.MISMATCH,
      message: 'La identidad o el rol ya no coinciden con la autorización central. Sesión cerrada.',
    };
  }

  return {
    ok: true,
    code: SESSION_AUTHORITY_CODES.OK,
    message: '',
    centers: Array.isArray(authoritative.centers) ? authoritative.centers : [],
  };
}
