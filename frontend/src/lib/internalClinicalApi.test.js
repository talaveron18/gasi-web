import { createInternalClinicalApi, InternalClinicalApiError, snakeToCamelEpisode } from './internalClinicalApi';

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('internalClinicalApi', () => {
  test('requires an individual actor identity', () => {
    expect(() => createInternalClinicalApi({ actorId: '' })).toThrow(InternalClinicalApiError);
  });

  test('sends individual identity and creates a synthetic episode with backend field names', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({
      id: 'DEMO-EP-0001',
      patient_ref: 'PACIENTE-DEMO-X',
      center: 'Centro ficticio Madrid 01',
      level: 2,
      status: 'ABIERTO',
      created_at: '2026-09-13T04:30:00Z',
      created_by_id: 'USR-DEMO-NURSE-01',
      responses: [],
      addenda: [],
      level_history: [],
      disposition_events: [],
    }, 201));

    const api = createInternalClinicalApi({ actorId: 'USR-DEMO-NURSE-01', baseUrl: 'https://synthetic.invalid', fetchImpl });
    const episode = await api.createEpisode({
      patientRef: 'PACIENTE-DEMO-X',
      center: 'Centro ficticio Madrid 01',
      level: 2,
      summary: 'Situación DEMO sin datos reales',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://synthetic.invalid/api/internal-prototype/episodes',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Demo-Actor-Id': 'USR-DEMO-NURSE-01' }),
        body: JSON.stringify({
          patient_ref: 'PACIENTE-DEMO-X',
          center: 'Centro ficticio Madrid 01',
          level: 2,
          summary: 'Situación DEMO sin datos reales',
        }),
      }),
    );
    expect(episode.patientRef).toBe('PACIENTE-DEMO-X');
    expect(episode.createdById).toBe('USR-DEMO-NURSE-01');
  });

  test('normalizes nested backend audit-adjacent clinical structures without inventing data', () => {
    const normalized = snakeToCamelEpisode({
      id: 'DEMO-EP-0002',
      level_history: [{ at: 't1', actor_id: 'USR-DEMO-NURSE-01', from: 2, to: 1 }],
      disposition_events: [{ id: 'D1', kind: 'TRASLADO', occurred_at: 't2', recorded_at: 't3', recorded_by_id: 'USR-DEMO-NURSE-01', recorded_by_role: 'nurse' }],
      responses: [{ id: 'R1', author_id: 'USR-DEMO-PHYS-01', created_at: 't4', status: 'EMITIDA', status_history: [], late_after_disposition: true, disposition_event_id: 'D1', late_reviewed_at: null, late_reviewed_by_id: null }],
      addenda: [{ id: 'A1', author_id: 'USR-DEMO-NURSE-01', author_role: 'nurse', created_at: 't5', text: 'DEMO' }],
    });

    expect(normalized.levelHistory[0].actorId).toBe('USR-DEMO-NURSE-01');
    expect(normalized.dispositionEvents[0].occurredAt).toBe('t2');
    expect(normalized.responses[0].lateAfterDisposition).toBe(true);
    expect(normalized.addenda[0].authorRole).toBe('nurse');
  });

  test('fails closed on network errors', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const api = createInternalClinicalApi({ actorId: 'USR-DEMO-PHYS-01', fetchImpl });

    await expect(api.listEpisodes()).rejects.toMatchObject({
      name: 'InternalClinicalApiError',
      code: 'network_unavailable',
      status: 0,
    });
  });

  test('surfaces safe backend error codes without returning clinical response bodies', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ detail: 'closed_episode_immutable', secret: 'do-not-expose' }, 409));
    const api = createInternalClinicalApi({ actorId: 'USR-DEMO-NURSE-01', fetchImpl });

    await expect(api.changeLevel('DEMO-EP-0001', 3)).rejects.toMatchObject({
      code: 'closed_episode_immutable',
      status: 409,
      message: 'La operación clínica sintética no pudo completarse.',
    });
  });

  test('uses explicit synthetic evidence transitions', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ status: 'ENTREGADA' }));
    const api = createInternalClinicalApi({ actorId: 'USR-DEMO-NURSE-01', fetchImpl });

    await api.advanceMessage('DEMO-EP-0001', 'DEMO-EP-0001-R1', 'synthetic_delivery_receipt', '2026-09-13T04:40:00Z');

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/internal-prototype/episodes/DEMO-EP-0001/responses/DEMO-EP-0001-R1/delivery',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'synthetic_delivery_receipt', at: '2026-09-13T04:40:00Z' }),
      }),
    );
  });
});
