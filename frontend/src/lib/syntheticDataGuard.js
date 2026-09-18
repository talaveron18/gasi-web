const SYNTHETIC_MARKERS = ['DEMO', 'FICTICIO', 'FICTICIA', 'SINTETICO', 'SINTETICA', 'TEST'];

export function isExplicitlySyntheticReference(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return false;
  return SYNTHETIC_MARKERS.some((marker) => normalized.includes(marker));
}

export function assertSyntheticClinicalInput({ patientRef, center }) {
  if (!isExplicitlySyntheticReference(patientRef)) {
    return { ok: false, errorCode: 'real_data_activation_blocked' };
  }
  if (!isExplicitlySyntheticReference(center)) {
    return { ok: false, errorCode: 'real_data_activation_blocked' };
  }
  return { ok: true };
}
