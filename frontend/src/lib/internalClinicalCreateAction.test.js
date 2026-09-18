import { createAuthoritativeNurseEpisode } from './internalClinicalActions';

describe('createAuthoritativeNurseEpisode', () => {
  const nurseSession = {
    id: 'USR-DEMO-NURSE-01',
    role: 'nurse',
    centers: ['Centro ficticio Madrid 01'],
  };

  test('bloquea roles distintos de Enfermería sin llamar a la API', async () => {
    const api = { createEpisode: jest.fn() };
    const result = await createAuthoritativeNurseEpisode({
      api,
      session: { id: 'USR-DEMO-PHYS-01', role: 'physician', centers: ['Centro ficticio Madrid 01'] },
      patientRef: 'PACIENTE-DEMO-001',
      center: 'Centro ficticio Madrid 01',
      level: 2,
      summary: 'Situación clínica sintética.',
    });

    expect(result).toEqual({ ok: false, errorCode: 'role_not_allowed' });
    expect(api.createEpisode).not.toHaveBeenCalled();
  });

  test('rechaza entradas incompletas o nivel fuera de N1-N3', async () => {
    const api = { createEpisode: jest.fn() };

    await expect(createAuthoritativeNurseEpisode({
      api,
      session: nurseSession,
      patientRef: ' ',
      center: 'Centro ficticio Madrid 01',
      level: 2,
      summary: 'Situación clínica sintética.',
    })).resolves.toEqual({ ok: false, errorCode: 'invalid_input' });

    await expect(createAuthoritativeNurseEpisode({
      api,
      session: nurseSession,
      patientRef: 'PACIENTE-DEMO-001',
      center: 'Centro ficticio Madrid 01',
      level: 4,
      summary: 'Situación clínica sintética.',
    })).resolves.toEqual({ ok: false, errorCode: 'invalid_input' });

    expect(api.createEpisode).not.toHaveBeenCalled();
  });

  test('bloquea centros no asignados antes de llamar a la API', async () => {
    const api = { createEpisode: jest.fn() };
    const result = await createAuthoritativeNurseEpisode({
      api,
      session: nurseSession,
      patientRef: 'PACIENTE-DEMO-001',
      center: 'Centro ficticio Madrid 99',
      level: 2,
      summary: 'Situación clínica sintética.',
    });

    expect(result).toEqual({ ok: false, errorCode: 'center_not_assigned' });
    expect(api.createEpisode).not.toHaveBeenCalled();
  });

  test('crea el episodio con valores normalizados mediante la autoridad sintética', async () => {
    const episode = { id: 'DEMO-EP-0001', status: 'ABIERTO', level: 1 };
    const api = { createEpisode: jest.fn().mockResolvedValue(episode) };
    const result = await createAuthoritativeNurseEpisode({
      api,
      session: nurseSession,
      patientRef: '  PACIENTE-DEMO-001  ',
      center: '  Centro ficticio Madrid 01  ',
      level: '1',
      summary: '  Situación clínica sintética.  ',
    });

    expect(api.createEpisode).toHaveBeenCalledWith({
      patientRef: 'PACIENTE-DEMO-001',
      center: 'Centro ficticio Madrid 01',
      level: 1,
      summary: 'Situación clínica sintética.',
    });
    expect(result).toEqual({ ok: true, episode });
  });

  test('minimiza errores del backend sin propagar contenido arbitrario', async () => {
    const api = { createEpisode: jest.fn().mockRejectedValue({ code: 'http_422', clinicalPayload: 'NO_PROPAGAR' }) };
    const result = await createAuthoritativeNurseEpisode({
      api,
      session: nurseSession,
      patientRef: 'PACIENTE-DEMO-001',
      center: 'Centro ficticio Madrid 01',
      level: 3,
      summary: 'Situación clínica sintética.',
    });

    expect(result).toEqual({ ok: false, errorCode: 'http_422' });
    expect(result.clinicalPayload).toBeUndefined();
  });
});
