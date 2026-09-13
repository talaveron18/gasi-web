import { submitAuthoritativePhysicianResponse } from './internalClinicalActions';

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
