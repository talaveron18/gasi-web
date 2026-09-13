import { loadAuthoritativeEpisodes } from './internalClinicalAuthority';

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
});
