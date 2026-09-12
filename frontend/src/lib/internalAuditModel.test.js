import { appendAuditEvent, createAuditEvent } from './internalAuditModel';

const actor = { id: 'USR-DEMO-NURSE-01', role: 'nurse' };

test('audit metadata strips clinical narrative and secrets', () => {
  const event = createAuditEvent({
    eventId: 'AUD-001',
    action: 'CASE_VIEWED',
    actor,
    subjectType: 'case',
    subjectId: 'CASE-DEMO-001',
    metadata: {
      centerId: 'CENTER-DEMO-01',
      level: 2,
      summary: 'clinical narrative must not be logged',
      response: 'medical response must not be logged',
      token: 'secret-token',
    },
    at: '2026-09-12T18:30:00.000Z',
  });

  expect(event.metadata.centerId).toBe('CENTER-DEMO-01');
  expect(event.metadata.level).toBe(2);
  expect(event.metadata.summary).toBeUndefined();
  expect(event.metadata.response).toBeUndefined();
  expect(event.metadata.token).toBeUndefined();
});

test('append-only helper rejects duplicate event identifiers', () => {
  const event = createAuditEvent({
    eventId: 'AUD-002',
    action: 'SESSION_STARTED',
    actor,
    subjectType: 'session',
    subjectId: 'SESSION-DEMO-01',
  });
  const log = appendAuditEvent([], event);
  expect(() => appendAuditEvent(log, event)).toThrow('duplicate_audit_event');
});
