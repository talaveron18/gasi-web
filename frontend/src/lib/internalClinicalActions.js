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

export async function changeAuthoritativeNurseLevel({ api, session, episodeId, currentLevel, nextLevel, status }) {
  if (!session || session.role !== 'nurse') {
    return { ok: false, errorCode: 'role_not_allowed' };
  }

  const cleanEpisodeId = String(episodeId || '').trim();
  const parsedCurrentLevel = Number(currentLevel);
  const parsedNextLevel = Number(nextLevel);
  if (!cleanEpisodeId || ![1, 2, 3].includes(parsedNextLevel)) {
    return { ok: false, errorCode: 'invalid_input' };
  }
  if (status === 'CERRADO') {
    return { ok: false, errorCode: 'episode_closed' };
  }
  if (parsedCurrentLevel === parsedNextLevel) {
    return { ok: false, errorCode: 'level_unchanged' };
  }

  try {
    const episode = await api.changeLevel(cleanEpisodeId, parsedNextLevel);
    return { ok: true, episode };
  } catch (error) {
    return { ok: false, errorCode: error?.code || 'operation_failed' };
  }
}

export async function appendAuthoritativeClinicalAddendum({ api, session, episodeId, text, status }) {
  if (!session || !['nurse', 'physician'].includes(session.role)) {
    return { ok: false, errorCode: 'role_not_allowed' };
  }

  const cleanEpisodeId = String(episodeId || '').trim();
  const cleanText = String(text || '').trim();
  if (!cleanEpisodeId || !cleanText) {
    return { ok: false, errorCode: 'invalid_input' };
  }
  if (status === 'CERRADO') {
    return { ok: false, errorCode: 'episode_closed' };
  }

  try {
    const episode = await api.addAddendum(cleanEpisodeId, cleanText);
    return { ok: true, episode };
  } catch (error) {
    return { ok: false, errorCode: error?.code || 'operation_failed' };
  }
}
