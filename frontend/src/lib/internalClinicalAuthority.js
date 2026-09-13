export async function loadAuthoritativeEpisodes(api) {
  try {
    const episodes = await api.listEpisodes();
    if (!Array.isArray(episodes)) {
      return { ok: false, episodes: [], errorCode: 'invalid_authority_payload' };
    }
    return { ok: true, episodes, errorCode: null };
  } catch (error) {
    return {
      ok: false,
      episodes: [],
      errorCode: typeof error?.code === 'string' ? error.code : 'authority_unavailable',
    };
  }
}
