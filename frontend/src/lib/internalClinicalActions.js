const EPISODE_CREATORS = ['nurse', 'psychologist', 'physiotherapist'];
const ADDENDUM_ROLES = ['nurse', 'physician', 'psychologist', 'physiotherapist'];
const CLOSING_ROLES = ['nurse', 'physician', 'psychologist', 'physiotherapist'];

export async function createAuthoritativeClinicalEpisode({ api, session, patientRef, center, level, summary }) {
  if (!session || !EPISODE_CREATORS.includes(session.role)) return { ok: false, errorCode: 'role_not_allowed' };
  const cleanPatientRef = String(patientRef || '').trim();
  const cleanCenter = String(center || '').trim();
  const cleanSummary = String(summary || '').trim();
  const parsedLevel = Number(level);
  if (!cleanPatientRef || !cleanCenter || !cleanSummary || ![1, 2, 3].includes(parsedLevel)) return { ok: false, errorCode: 'invalid_input' };
  const assignedCenters = Array.isArray(session.centers) ? session.centers : [];
  if (!assignedCenters.includes(cleanCenter)) return { ok: false, errorCode: 'center_not_assigned' };
  try {
    const episode = await api.createEpisode({ patientRef: cleanPatientRef, center: cleanCenter, level: parsedLevel, summary: cleanSummary });
    return { ok: true, episode };
  } catch (error) { return { ok: false, errorCode: error?.code || 'operation_failed' }; }
}

// Compatibilidad temporal con pruebas/consumidores anteriores.
export const createAuthoritativeNurseEpisode = createAuthoritativeClinicalEpisode;

export async function submitAuthoritativePhysicianResponse({ api, session, episodeId, text }) {
  if (!session || session.role !== 'physician') return { ok: false, errorCode: 'role_not_allowed' };
  const cleanEpisodeId = String(episodeId || '').trim();
  const cleanText = String(text || '').trim();
  if (!cleanEpisodeId || !cleanText) return { ok: false, errorCode: 'invalid_input' };
  try { return { ok: true, episode: await api.respond(cleanEpisodeId, cleanText) }; }
  catch (error) { return { ok: false, errorCode: error?.code || 'operation_failed' }; }
}

export async function changeAuthoritativeNurseLevel({ api, session, episodeId, currentLevel, nextLevel, status }) {
  if (!session || session.role !== 'nurse') return { ok: false, errorCode: 'role_not_allowed' };
  const cleanEpisodeId = String(episodeId || '').trim();
  const parsedCurrentLevel = Number(currentLevel);
  const parsedNextLevel = Number(nextLevel);
  if (!cleanEpisodeId || ![1, 2, 3].includes(parsedNextLevel)) return { ok: false, errorCode: 'invalid_input' };
  if (status === 'CERRADO') return { ok: false, errorCode: 'episode_closed' };
  if (parsedCurrentLevel === parsedNextLevel) return { ok: false, errorCode: 'level_unchanged' };
  try { return { ok: true, episode: await api.changeLevel(cleanEpisodeId, parsedNextLevel) }; }
  catch (error) { return { ok: false, errorCode: error?.code || 'operation_failed' }; }
}

export async function appendAuthoritativeClinicalAddendum({ api, session, episodeId, text, status }) {
  if (!session || !ADDENDUM_ROLES.includes(session.role)) return { ok: false, errorCode: 'role_not_allowed' };
  const cleanEpisodeId = String(episodeId || '').trim();
  const cleanText = String(text || '').trim();
  if (!cleanEpisodeId || !cleanText) return { ok: false, errorCode: 'invalid_input' };
  if (status === 'CERRADO') return { ok: false, errorCode: 'episode_closed' };
  try { return { ok: true, episode: await api.addAddendum(cleanEpisodeId, cleanText) }; }
  catch (error) { return { ok: false, errorCode: error?.code || 'operation_failed' }; }
}

export async function closeAuthoritativeClinicalEpisode({ api, session, episodeId, status, responses, followUpPending = false, acknowledgementRequired = false, handoffRequired = false, handoffAcknowledged = false }) {
  if (!session || !CLOSING_ROLES.includes(session.role)) return { ok: false, errorCode: 'role_not_allowed' };
  const cleanEpisodeId = String(episodeId || '').trim();
  if (!cleanEpisodeId) return { ok: false, errorCode: 'invalid_input' };
  if (status === 'CERRADO') return { ok: false, errorCode: 'episode_closed' };
  if (status !== 'RESPONDIDO' || !Array.isArray(responses) || responses.length === 0) return { ok: false, errorCode: 'response_required' };
  if (followUpPending) return { ok: false, errorCode: 'follow_up_pending' };
  if (handoffRequired && !handoffAcknowledged) return { ok: false, errorCode: 'handoff_acknowledgement_missing' };
  if (acknowledgementRequired && responses[responses.length - 1]?.status !== 'LEIDA') return { ok: false, errorCode: 'acknowledgement_missing' };
  if (responses.some((item) => item?.lateAfterDisposition && !item?.lateReviewedAt)) return { ok: false, errorCode: 'late_response_review_pending' };
  const payload = { follow_up_pending: false, acknowledgement_required: Boolean(acknowledgementRequired), handoff_required: Boolean(handoffRequired), handoff_acknowledged: Boolean(handoffRequired && handoffAcknowledged) };
  try { return { ok: true, episode: await api.closeEpisode(cleanEpisodeId, payload) }; }
  catch (error) { return { ok: false, errorCode: error?.code || 'operation_failed' }; }
}