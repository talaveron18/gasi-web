const DEFAULT_BASE = process.env.REACT_APP_BACKEND_URL || '';

export class InternalClinicalApiError extends Error {
  constructor(message, { status = 0, code = 'unknown_error' } = {}) {
    super(message);
    this.name = 'InternalClinicalApiError';
    this.status = status;
    this.code = code;
  }
}

const snakeToCamelEpisode = (episode) => {
  if (!episode || typeof episode !== 'object') return episode;
  return {
    ...episode,
    patientRef: episode.patient_ref,
    createdAt: episode.created_at,
    createdById: episode.created_by_id,
    respondedAt: episode.responded_at,
    respondedById: episode.responded_by_id,
    closedAt: episode.closed_at,
    closedById: episode.closed_by_id,
    levelHistory: (episode.level_history || []).map((item) => ({
      ...item,
      actorId: item.actor_id,
    })),
    dispositionEvents: (episode.disposition_events || []).map((item) => ({
      ...item,
      occurredAt: item.occurred_at,
      recordedAt: item.recorded_at,
      recordedById: item.recorded_by_id,
      recordedByRole: item.recorded_by_role,
    })),
    responses: (episode.responses || []).map((item) => ({
      ...item,
      authorId: item.author_id,
      createdAt: item.created_at,
      statusHistory: item.status_history || [],
      lateAfterDisposition: Boolean(item.late_after_disposition),
      dispositionEventId: item.disposition_event_id,
      lateReviewedAt: item.late_reviewed_at,
      lateReviewedById: item.late_reviewed_by_id,
    })),
    addenda: (episode.addenda || []).map((item) => ({
      ...item,
      authorId: item.author_id,
      authorRole: item.author_role,
      createdAt: item.created_at,
    })),
  };
};

async function parseFailure(response) {
  let code = `http_${response.status}`;
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') code = body.detail;
  } catch (_) {
    // Deliberately avoid exposing response bodies or technical details.
  }
  throw new InternalClinicalApiError('La operación clínica sintética no pudo completarse.', {
    status: response.status,
    code,
  });
}

export function createInternalClinicalApi({ actorId, baseUrl = DEFAULT_BASE, fetchImpl = fetch }) {
  if (!actorId) throw new InternalClinicalApiError('Falta identidad individual para el prototipo.', { code: 'missing_actor' });

  const root = `${baseUrl}/api/internal-prototype`;
  const request = async (path, options = {}) => {
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Actor-Id': actorId,
          ...(options.headers || {}),
        },
      });
    } catch (_) {
      throw new InternalClinicalApiError('El backend clínico sintético no está disponible.', {
        status: 0,
        code: 'network_unavailable',
      });
    }

    if (!response.ok) return parseFailure(response);
    if (response.status === 204) return null;
    return response.json();
  };

  return {
    async listEpisodes() {
      const data = await request('/episodes');
      return Array.isArray(data) ? data.map(snakeToCamelEpisode) : [];
    },
    async getEpisode(episodeId) {
      return snakeToCamelEpisode(await request(`/episodes/${encodeURIComponent(episodeId)}`));
    },
    async createEpisode({ patientRef, center, level, summary }) {
      return snakeToCamelEpisode(await request('/episodes', {
        method: 'POST',
        body: JSON.stringify({ patient_ref: patientRef, center, level, summary }),
      }));
    },
    async changeLevel(episodeId, level) {
      return snakeToCamelEpisode(await request(`/episodes/${encodeURIComponent(episodeId)}/level`, {
        method: 'POST',
        body: JSON.stringify({ level }),
      }));
    },
    async recordDisposition(episodeId, kind, occurredAt) {
      return snakeToCamelEpisode(await request(`/episodes/${encodeURIComponent(episodeId)}/disposition`, {
        method: 'POST',
        body: JSON.stringify({ kind, occurred_at: occurredAt }),
      }));
    },
    async respond(episodeId, text) {
      return snakeToCamelEpisode(await request(`/episodes/${encodeURIComponent(episodeId)}/responses`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }));
    },
    async reviewLateResponse(episodeId, responseId) {
      return request(`/episodes/${encodeURIComponent(episodeId)}/responses/${encodeURIComponent(responseId)}/late-review`, {
        method: 'POST',
      });
    },
    async addAddendum(episodeId, text) {
      return snakeToCamelEpisode(await request(`/episodes/${encodeURIComponent(episodeId)}/addenda`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }));
    },
    async advanceMessage(episodeId, responseId, kind, at) {
      return request(`/episodes/${encodeURIComponent(episodeId)}/responses/${encodeURIComponent(responseId)}/delivery`, {
        method: 'POST',
        body: JSON.stringify({ kind, at }),
      });
    },
    async closeEpisode(episodeId, payload) {
      return snakeToCamelEpisode(await request(`/episodes/${encodeURIComponent(episodeId)}/close`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }));
    },
  };
}

export { snakeToCamelEpisode };
