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
const PENDING_STATUSES = new Set(['ABIERTO', 'RESPONDIDO']);

export function selectAuthoritativeEpisodeById({ episodes, episodeId }) {
  if (!Array.isArray(episodes) || typeof episodeId !== 'string' || !episodeId.trim()) return null;
  return episodes.find((episode) => episode && episode.id === episodeId) || null;
}

export function partitionAuthoritativeEpisodes(episodes) {
  if (!Array.isArray(episodes)) return { pending: [], closed: [] };

  return episodes.reduce((groups, episode) => {
    if (!episode || typeof episode !== 'object' || typeof episode.id !== 'string' || !episode.id) return groups;
    if (PENDING_STATUSES.has(episode.status)) groups.pending.push(episode);
    if (episode.status === 'CERRADO') groups.closed.push(episode);
    return groups;
  }, { pending: [], closed: [] });
}

export function selectPreferredAuthoritativeEpisodeId({ episodes, currentId = null }) {
  if (!Array.isArray(episodes)) return null;

  const current = typeof currentId === 'string' && currentId
    ? episodes.find((episode) => episode && episode.id === currentId)
    : null;
  if (current) return current.id;

  const { pending, closed } = partitionAuthoritativeEpisodes(episodes);
  return pending[0]?.id || closed[0]?.id || null;
}

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
