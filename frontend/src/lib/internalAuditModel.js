const FORBIDDEN_AUDIT_KEYS = new Set([
  'summary',
  'response',
  'text',
  'clinicalText',
  'diagnosis',
  'treatment',
  'secret',
  'password',
  'token',
]);

export function sanitizeAuditMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      if (FORBIDDEN_AUDIT_KEYS.has(key)) return false;
      if (value == null) return true;
      return ['string', 'number', 'boolean'].includes(typeof value);
    }),
  );
}

export function createAuditEvent({
  eventId,
  action,
  actor,
  subjectType,
  subjectId,
  metadata = {},
  at = new Date().toISOString(),
}) {
  if (!eventId || !action || !actor?.id || !actor?.role || !subjectType || !subjectId) {
    throw new Error('invalid_audit_event');
  }
  return Object.freeze({
    eventId,
    at,
    action,
    actorId: actor.id,
    actorRole: actor.role,
    subjectType,
    subjectId,
    metadata: Object.freeze(sanitizeAuditMetadata(metadata)),
  });
}

export function appendAuditEvent(log, event) {
  if (!Array.isArray(log) || !event?.eventId) throw new Error('invalid_audit_append');
  if (log.some((item) => item.eventId === event.eventId)) throw new Error('duplicate_audit_event');
  return Object.freeze([...log, event]);
}

export function hasAuditEvent(log, eventId) {
  return Array.isArray(log) && log.some((event) => event.eventId === eventId);
}
