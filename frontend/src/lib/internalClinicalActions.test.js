import { appendAuthoritativeClinicalAddendum, changeAuthoritativeNurseLevel, closeAuthoritativeClinicalEpisode, submitAuthoritativePhysicianResponse } from './internalClinicalActions';

describe('submitAuthoritativePhysicianResponse', () => {
  test('bloquea roles no facultativos sin llamar a la API', async () => {
    const api = { respond: jest.fn() };
    const result = await submitAuthoritativePhysicianResponse({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      text: 'Respuesta sintética',
    });

    expect(result).toEqual({ ok: false, errorCode: 'role_not_allowed' });
    expect(api.respond).not.toHaveBeenCalled();
  });

  test('rechaza contenido vacío', async () => {
    const api = { respond: jest.fn() };
    const result = await submitAuthoritativePhysicianResponse({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      text: '   ',
    });

    expect(result).toEqual({ ok: false, errorCode: 'invalid_input' });
    expect(api.respond).not.toHaveBeenCalled();
  });

  test('envía respuesta sintética atribuida mediante el cliente autoritativo', async () => {
    const episode = { id: 'CASE-DEMO-001', status: 'RESPONDIDO' };
    const api = { respond: jest.fn().mockResolvedValue(episode) };
    const result = await submitAuthoritativePhysicianResponse({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      text: '  Criterio médico sintético.  ',
    });

    expect(api.respond).toHaveBeenCalledWith('CASE-DEMO-001', 'Criterio médico sintético.');
    expect(result).toEqual({ ok: true, episode });
  });

  test('minimiza el error y no propaga cuerpos arbitrarios', async () => {
    const api = { respond: jest.fn().mockRejectedValue({ code: 'http_403', secret: 'NO_PROPAGAR' }) };
    const result = await submitAuthoritativePhysicianResponse({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      text: 'Respuesta sintética',
    });

    expect(result).toEqual({ ok: false, errorCode: 'http_403' });
    expect(result.secret).toBeUndefined();
  });
});

describe('changeAuthoritativeNurseLevel', () => {
  test('bloquea roles distintos de Enfermería', async () => {
    const api = { changeLevel: jest.fn() };
    const result = await changeAuthoritativeNurseLevel({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      currentLevel: 2,
      nextLevel: 1,
      status: 'ABIERTO',
    });

    expect(result).toEqual({ ok: false, errorCode: 'role_not_allowed' });
    expect(api.changeLevel).not.toHaveBeenCalled();
  });

  test('rechaza episodios cerrados y niveles sin cambio', async () => {
    const api = { changeLevel: jest.fn() };
    const session = { id: 'USR-DEMO-NURSE-01', role: 'nurse' };

    await expect(changeAuthoritativeNurseLevel({
      api, session, episodeId: 'CASE-DEMO-001', currentLevel: 2, nextLevel: 1, status: 'CERRADO',
    })).resolves.toEqual({ ok: false, errorCode: 'episode_closed' });

    await expect(changeAuthoritativeNurseLevel({
      api, session, episodeId: 'CASE-DEMO-001', currentLevel: 2, nextLevel: 2, status: 'ABIERTO',
    })).resolves.toEqual({ ok: false, errorCode: 'level_unchanged' });

    expect(api.changeLevel).not.toHaveBeenCalled();
  });

  test('reclasifica N1-N3 mediante autoridad sintética y devuelve el episodio actualizado', async () => {
    const episode = { id: 'CASE-DEMO-001', level: 1, status: 'ABIERTO' };
    const api = { changeLevel: jest.fn().mockResolvedValue(episode) };
    const result = await changeAuthoritativeNurseLevel({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      currentLevel: 2,
      nextLevel: 1,
      status: 'ABIERTO',
    });

    expect(api.changeLevel).toHaveBeenCalledWith('CASE-DEMO-001', 1);
    expect(result).toEqual({ ok: true, episode });
  });

  test('minimiza errores de reclasificación sin propagar payloads', async () => {
    const api = { changeLevel: jest.fn().mockRejectedValue({ code: 'http_409', detail: 'NO_PROPAGAR' }) };
    const result = await changeAuthoritativeNurseLevel({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      currentLevel: 2,
      nextLevel: 3,
      status: 'ABIERTO',
    });

    expect(result).toEqual({ ok: false, errorCode: 'http_409' });
    expect(result.detail).toBeUndefined();
  });
});

describe('appendAuthoritativeClinicalAddendum', () => {
  test('permite adenda solo a roles clínicos y nunca a Administración', async () => {
    const api = { addAddendum: jest.fn() };
    const result = await appendAuthoritativeClinicalAddendum({
      api,
      session: { id: 'USR-DEMO-ADMIN-01', role: 'admin' },
      episodeId: 'CASE-DEMO-001',
      text: 'Corrección sintética',
      status: 'ABIERTO',
    });

    expect(result).toEqual({ ok: false, errorCode: 'role_not_allowed' });
    expect(api.addAddendum).not.toHaveBeenCalled();
  });

  test('rechaza texto vacío y episodios cerrados sin mutar', async () => {
    const api = { addAddendum: jest.fn() };
    const session = { id: 'USR-DEMO-NURSE-01', role: 'nurse' };

    await expect(appendAuthoritativeClinicalAddendum({
      api, session, episodeId: 'CASE-DEMO-001', text: '   ', status: 'ABIERTO',
    })).resolves.toEqual({ ok: false, errorCode: 'invalid_input' });

    await expect(appendAuthoritativeClinicalAddendum({
      api, session, episodeId: 'CASE-DEMO-001', text: 'Corrección', status: 'CERRADO',
    })).resolves.toEqual({ ok: false, errorCode: 'episode_closed' });

    expect(api.addAddendum).not.toHaveBeenCalled();
  });

  test('añade corrección append-only mediante la autoridad sintética', async () => {
    const episode = {
      id: 'CASE-DEMO-001',
      status: 'ABIERTO',
      addenda: [{ id: 'CASE-DEMO-001-A1', text: 'Corrección sintética' }],
    };
    const api = { addAddendum: jest.fn().mockResolvedValue(episode) };
    const result = await appendAuthoritativeClinicalAddendum({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      text: '  Corrección sintética  ',
      status: 'ABIERTO',
    });

    expect(api.addAddendum).toHaveBeenCalledWith('CASE-DEMO-001', 'Corrección sintética');
    expect(result).toEqual({ ok: true, episode });
  });

  test('minimiza errores de adenda sin propagar detalles arbitrarios', async () => {
    const api = { addAddendum: jest.fn().mockRejectedValue({ code: 'http_409', detail: 'NO_PROPAGAR' }) };
    const result = await appendAuthoritativeClinicalAddendum({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      text: 'Corrección sintética',
      status: 'ABIERTO',
    });

    expect(result).toEqual({ ok: false, errorCode: 'http_409' });
    expect(result.detail).toBeUndefined();
  });
});

describe('closeAuthoritativeClinicalEpisode', () => {
  const response = { id: 'CASE-DEMO-001-R1', status: 'LEIDA', lateAfterDisposition: false };

  test('bloquea Administración y episodios sin respuesta previa', async () => {
    const api = { closeEpisode: jest.fn() };

    await expect(closeAuthoritativeClinicalEpisode({
      api,
      session: { id: 'USR-DEMO-ADMIN-01', role: 'admin' },
      episodeId: 'CASE-DEMO-001',
      status: 'RESPONDIDO',
      responses: [response],
    })).resolves.toEqual({ ok: false, errorCode: 'role_not_allowed' });

    await expect(closeAuthoritativeClinicalEpisode({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      status: 'ABIERTO',
      responses: [],
    })).resolves.toEqual({ ok: false, errorCode: 'response_required' });

    expect(api.closeEpisode).not.toHaveBeenCalled();
  });

  test('impide cerrar si existe seguimiento o relevo requerido no confirmado', async () => {
    const api = { closeEpisode: jest.fn() };
    const session = { id: 'USR-DEMO-NURSE-01', role: 'nurse' };

    await expect(closeAuthoritativeClinicalEpisode({
      api, session, episodeId: 'CASE-DEMO-001', status: 'RESPONDIDO', responses: [response], followUpPending: true,
    })).resolves.toEqual({ ok: false, errorCode: 'follow_up_pending' });

    await expect(closeAuthoritativeClinicalEpisode({
      api, session, episodeId: 'CASE-DEMO-001', status: 'RESPONDIDO', responses: [response], handoffRequired: true,
    })).resolves.toEqual({ ok: false, errorCode: 'handoff_acknowledgement_missing' });

    expect(api.closeEpisode).not.toHaveBeenCalled();
  });

  test('exige lectura cuando el cierre declara acuse obligatorio', async () => {
    const api = { closeEpisode: jest.fn() };
    const result = await closeAuthoritativeClinicalEpisode({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      status: 'RESPONDIDO',
      responses: [{ ...response, status: 'EMITIDA' }],
      acknowledgementRequired: true,
    });

    expect(result).toEqual({ ok: false, errorCode: 'acknowledgement_missing' });
    expect(api.closeEpisode).not.toHaveBeenCalled();
  });

  test('no cierra con una respuesta tardía pendiente de revisión', async () => {
    const api = { closeEpisode: jest.fn() };
    const result = await closeAuthoritativeClinicalEpisode({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician' },
      episodeId: 'CASE-DEMO-001',
      status: 'RESPONDIDO',
      responses: [{ ...response, lateAfterDisposition: true, lateReviewedAt: null }],
    });

    expect(result).toEqual({ ok: false, errorCode: 'late_response_review_pending' });
    expect(api.closeEpisode).not.toHaveBeenCalled();
  });

  test('cierra contra autoridad sintética y devuelve el episodio actualizado', async () => {
    const episode = { id: 'CASE-DEMO-001', status: 'CERRADO', closedById: 'USR-DEMO-NURSE-01' };
    const api = { closeEpisode: jest.fn().mockResolvedValue(episode) };
    const result = await closeAuthoritativeClinicalEpisode({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      status: 'RESPONDIDO',
      responses: [response],
      acknowledgementRequired: true,
      handoffRequired: true,
      handoffAcknowledged: true,
    });

    expect(api.closeEpisode).toHaveBeenCalledWith('CASE-DEMO-001', {
      follow_up_pending: false,
      acknowledgement_required: true,
      handoff_required: true,
      handoff_acknowledged: true,
    });
    expect(result).toEqual({ ok: true, episode });
  });

  test('minimiza errores de cierre sin propagar detalles arbitrarios', async () => {
    const api = { closeEpisode: jest.fn().mockRejectedValue({ code: 'http_409', secret: 'NO_PROPAGAR' }) };
    const result = await closeAuthoritativeClinicalEpisode({
      api,
      session: { id: 'USR-DEMO-NURSE-01', role: 'nurse' },
      episodeId: 'CASE-DEMO-001',
      status: 'RESPONDIDO',
      responses: [response],
    });

    expect(result).toEqual({ ok: false, errorCode: 'http_409' });
    expect(result.secret).toBeUndefined();
  });
});
