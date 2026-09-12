import {
  EPISODE_STATUS,
  MESSAGE_STATUS,
  INTERNAL_ROLES,
  appendMessageStatus,
  canCloseSyntheticEpisode,
  closeSyntheticEpisode,
  createSyntheticEpisode,
  respondToSyntheticEpisode,
  visibleEpisodeFieldsForRole,
} from './internalClinicalModel';

const nurse = { id: 'USR-NURSE-TEST', role: INTERNAL_ROLES.NURSE };
const physician = { id: 'USR-PHYS-TEST', role: INTERNAL_ROLES.PHYSICIAN };
const admin = { id: 'USR-ADMIN-TEST', role: INTERNAL_ROLES.ADMIN };

const makeEpisode = () => createSyntheticEpisode({
  id: 'CASE-TEST-001',
  patientRef: 'PATIENT-SYNTHETIC-001',
  center: 'Centro ficticio Madrid 01',
  level: 2,
  summary: 'Caso sintético de prueba.',
  actor: nurse,
  at: '2026-09-12T18:00:00.000Z',
});

test('a clinical response changes episode status to RESPONDIDO but message is only EMITIDA', () => {
  const episode = respondToSyntheticEpisode(makeEpisode(), {
    text: 'Respuesta sintética.',
    actor: physician,
    at: '2026-09-12T18:01:00.000Z',
  });

  expect(episode.status).toBe(EPISODE_STATUS.RESPONDED);
  expect(episode.responses[0].status).toBe(MESSAGE_STATUS.ISSUED);
});

test('delivery and read states require technical evidence', () => {
  const episode = respondToSyntheticEpisode(makeEpisode(), { text: 'Respuesta sintética.', actor: physician });
  const message = episode.responses[0];

  expect(() => appendMessageStatus(message, MESSAGE_STATUS.DELIVERED, physician)).toThrow('invalid_message_status_transition');

  const delivered = appendMessageStatus(message, MESSAGE_STATUS.DELIVERED, physician, {
    kind: 'transport_receipt',
    at: '2026-09-12T18:02:00.000Z',
  });
  expect(delivered.status).toBe(MESSAGE_STATUS.DELIVERED);

  expect(() => appendMessageStatus(delivered, MESSAGE_STATUS.READ, nurse)).toThrow('invalid_message_status_transition');

  const read = appendMessageStatus(delivered, MESSAGE_STATUS.READ, nurse, {
    kind: 'authenticated_acknowledgement',
    at: '2026-09-12T18:03:00.000Z',
  });
  expect(read.status).toBe(MESSAGE_STATUS.READ);
});

test('an episode does not close while follow-up is pending', () => {
  const episode = respondToSyntheticEpisode(makeEpisode(), { text: 'Respuesta sintética.', actor: physician });
  expect(canCloseSyntheticEpisode(episode, { followUpPending: true })).toBe(false);
  expect(() => closeSyntheticEpisode(episode, { actor: nurse, followUpPending: true })).toThrow('close_not_allowed');
});

test('when acknowledgement is required, EMITIDA is not enough to close', () => {
  const episode = respondToSyntheticEpisode(makeEpisode(), { text: 'Respuesta sintética.', actor: physician });
  expect(canCloseSyntheticEpisode(episode, { acknowledgementRequired: true })).toBe(false);
});

test('admin projection excludes clinical narrative and response content', () => {
  const episode = respondToSyntheticEpisode(makeEpisode(), { text: 'Respuesta sintética sensible.', actor: physician });
  const view = visibleEpisodeFieldsForRole(episode, admin.role);

  expect(view.summary).toBeUndefined();
  expect(view.responses).toBeUndefined();
  expect(view.patientRef).toBeUndefined();
  expect(view.id).toBe(episode.id);
  expect(view.status).toBe(EPISODE_STATUS.RESPONDED);
});
