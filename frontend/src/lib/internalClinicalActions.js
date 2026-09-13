export async function submitAuthoritativePhysicianResponse({ api, session, episodeId, text }) {
  if (!session || session.role !== 'physician') {
    return { ok: false, errorCode: 'role_not_allowed' };
  }

  const cleanEpisodeId = String(episodeId || '').trim();
  const cleanText = String(text || '').trim();
  if (!cleanEpisodeId || !cleanText) {
    return { ok: false, errorCode: 'invalid_input' };
  }

  try {
    const episode = await api.respond(cleanEpisodeId, cleanText);
    return { ok: true, episode };
  } catch (error) {
    return { ok: false, errorCode: error?.code || 'operation_failed' };
  }
}
