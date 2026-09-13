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

const CLINICAL_ROLES = new Set(['nurse', 'physician']);

export function selectAuthoritativeAddendaForDisplay({ episode, session }) {
  if (!episode || !session || !CLINICAL_ROLES.has(session.role)) return [];
  if (!Array.isArray(episode.addenda)) return [];

  return episode.addenda
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      text: typeof item.text === 'string' ? item.text : '',
      authorId: typeof item.authorId === 'string' ? item.authorId : '',
      authorRole: item.authorRole === 'nurse' || item.authorRole === 'physician' ? item.authorRole : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
    }))
    .filter((item) => item.id && item.text && item.authorId && item.authorRole && item.createdAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
