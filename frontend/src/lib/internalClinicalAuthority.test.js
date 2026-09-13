import { loadAuthoritativeEpisodes, selectAuthoritativeAddendaForDisplay } from './internalClinicalAuthority';

describe('internalClinicalAuthority', () => {
  test('returns only episodes supplied by the central synthetic authority', async () => {
    const episodes = [{ id: 'DEMO-EP-0001', status: 'ABIERTO' }];
    const api = { listEpisodes: jest.fn().mockResolvedValue(episodes) };

    await expect(loadAuthoritativeEpisodes(api)).resolves.toEqual({
      ok: true,
      episodes,
      errorCode: null,
    });
  });

  test('fails closed and never returns local fallback episodes when authority is unavailable', async () => {
    const api = { listEpisodes: jest.fn().mockRejectedValue({ code: 'network_unavailable' }) };

    await expect(loadAuthoritativeEpisodes(api)).resolves.toEqual({
      ok: false,
      episodes: [],
      errorCode: 'network_unavailable',
    });
  });

  test('rejects malformed authority payloads', async () => {
    const api = { listEpisodes: jest.fn().mockResolvedValue({ id: 'not-a-list' }) };

    await expect(loadAuthoritativeEpisodes(api)).resolves.toEqual({
      ok: false,
      episodes: [],
      errorCode: 'invalid_authority_payload',
    });
  });

  test('exposes complete append-only addendum history to clinical roles in timestamp order', () => {
    const episode = {
      addenda: [
        { id: 'DEMO-EP-0001-A2', text: 'DEMO complemento 2', authorId: 'USR-DEMO-PHYS-01', authorRole: 'physician', createdAt: '2026-09-13T10:02:00Z' },
        { id: 'DEMO-EP-0001-A1', text: 'DEMO complemento 1', authorId: 'USR-DEMO-NURSE-01', authorRole: 'nurse', createdAt: '2026-09-13T10:01:00Z' },
      ],
    };

    expect(selectAuthoritativeAddendaForDisplay({ episode, session: { role: 'nurse' } })).toEqual([
      { id: 'DEMO-EP-0001-A1', text: 'DEMO complemento 1', authorId: 'USR-DEMO-NURSE-01', authorRole: 'nurse', createdAt: '2026-09-13T10:01:00Z' },
      { id: 'DEMO-EP-0001-A2', text: 'DEMO complemento 2', authorId: 'USR-DEMO-PHYS-01', authorRole: 'physician', createdAt: '2026-09-13T10:02:00Z' },
    ]);
  });

  test('never exposes addendum narrative to administration', () => {
    const episode = {
      addenda: [{ id: 'DEMO-EP-0001-A1', text: 'DEMO narrativa clínica', authorId: 'USR-DEMO-NURSE-01', authorRole: 'nurse', createdAt: '2026-09-13T10:01:00Z' }],
    };

    expect(selectAuthoritativeAddendaForDisplay({ episode, session: { role: 'admin' } })).toEqual([]);
  });

  test('drops malformed addenda instead of rendering partial or unattributed clinical corrections', () => {
    const episode = {
      addenda: [
        { id: 'DEMO-EP-0001-A1', text: 'DEMO válida', authorId: 'USR-DEMO-NURSE-01', authorRole: 'nurse', createdAt: '2026-09-13T10:01:00Z' },
        { id: 'DEMO-EP-0001-A2', text: 'DEMO sin autor', authorRole: 'nurse', createdAt: '2026-09-13T10:02:00Z' },
        { id: 'DEMO-EP-0001-A3', text: 'DEMO rol desconocido', authorId: 'USR-DEMO-X', authorRole: 'other', createdAt: '2026-09-13T10:03:00Z' },
      ],
    };

    expect(selectAuthoritativeAddendaForDisplay({ episode, session: { role: 'physician' } })).toEqual([
      { id: 'DEMO-EP-0001-A1', text: 'DEMO válida', authorId: 'USR-DEMO-NURSE-01', authorRole: 'nurse', createdAt: '2026-09-13T10:01:00Z' },
    ]);
  });
});
