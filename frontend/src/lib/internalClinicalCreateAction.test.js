import { createAuthoritativeNurseEpisode } from './internalClinicalActions';

describe('createAuthoritativeNurseEpisode', () => {
  const nurseSession = { id:'USR-DEMO-NURSE-01', role:'nurse', centers:['Centro ficticio Madrid 01'] };
  const patientId = 'GASI-PT-00000001';

  test('bloquea roles distintos de Enfermería sin llamar a la API', async () => {
    const api={createEpisode:jest.fn()};
    const result=await createAuthoritativeNurseEpisode({api,session:{id:'USR-DEMO-PHYS-01',role:'physician',centers:['Centro ficticio Madrid 01']},patientId,center:'Centro ficticio Madrid 01',level:2,summary:'Situación clínica sintética.'});
    expect(result).toEqual({ok:false,errorCode:'role_not_allowed'});
    expect(api.createEpisode).not.toHaveBeenCalled();
  });

  test('rechaza entradas incompletas o nivel fuera de N1-N3', async () => {
    const api={createEpisode:jest.fn()};
    await expect(createAuthoritativeNurseEpisode({api,session:nurseSession,patientId,center:' ',level:2,summary:'Situación clínica sintética.'})).resolves.toEqual({ok:false,errorCode:'invalid_input'});
    await expect(createAuthoritativeNurseEpisode({api,session:nurseSession,patientId,center:'Centro ficticio Madrid 01',level:4,summary:'Situación clínica sintética.'})).resolves.toEqual({ok:false,errorCode:'invalid_input'});
    await expect(createAuthoritativeNurseEpisode({api,session:nurseSession,center:'Centro ficticio Madrid 01',level:2,summary:'Situación clínica sintética.',patient:{given_name:'',family_name:'',age_years:null}})).resolves.toEqual({ok:false,errorCode:'patient_identity_required'});
    expect(api.createEpisode).not.toHaveBeenCalled();
  });

  test('bloquea centros no asignados antes de llamar a la API', async () => {
    const api={createEpisode:jest.fn()};
    const result=await createAuthoritativeNurseEpisode({api,session:nurseSession,patientId,center:'Centro ficticio Madrid 99',level:2,summary:'Situación clínica sintética.'});
    expect(result).toEqual({ok:false,errorCode:'center_not_assigned'});
    expect(api.createEpisode).not.toHaveBeenCalled();
  });

  test('crea el episodio sobre una historia existente con valores normalizados', async () => {
    const episode={id:'DEMO-EP-0001',status:'ABIERTO',level:1,patientId};
    const api={createEpisode:jest.fn().mockResolvedValue(episode)};
    const result=await createAuthoritativeNurseEpisode({api,session:nurseSession,patientId:'  GASI-PT-00000001  ',center:'  Centro ficticio Madrid 01  ',level:'1',summary:'  Situación clínica sintética.  '});
    expect(api.createEpisode).toHaveBeenCalledWith({patientId,patient:null,confirmDistinctFromPatientId:null,center:'Centro ficticio Madrid 01',level:1,summary:'Situación clínica sintética.'});
    expect(result).toEqual({ok:true,episode});
  });

  test('crea una nueva historia estructurada cuando no hay paciente seleccionado', async () => {
    const episode={id:'DEMO-EP-0002',status:'ABIERTO'};
    const api={createEpisode:jest.fn().mockResolvedValue(episode)};
    const patient={given_name:'Javier',family_name:'Suárez',age_years:38,dni:'12345678Z'};
    const result=await createAuthoritativeNurseEpisode({api,session:nurseSession,patient,center:'Centro ficticio Madrid 01',level:2,summary:'Consulta nueva'});
    expect(api.createEpisode).toHaveBeenCalledWith({patientId:null,patient,confirmDistinctFromPatientId:null,center:'Centro ficticio Madrid 01',level:2,summary:'Consulta nueva'});
    expect(result).toEqual({ok:true,episode});
  });

  test('propaga confirmación explícita de persona distinta sin saltarse identificadores fuertes', async () => {
    const episode={id:'DEMO-EP-0003',status:'ABIERTO'};
    const api={createEpisode:jest.fn().mockResolvedValue(episode)};
    const patient={given_name:'Javier',family_name:'Suárez',age_years:38};
    const result=await createAuthoritativeNurseEpisode({api,session:nurseSession,patient,confirmDistinctFromPatientId:'GASI-PT-OLD',center:'Centro ficticio Madrid 01',level:2,summary:'Persona distinta confirmada'});
    expect(api.createEpisode).toHaveBeenCalledWith({patientId:null,patient,confirmDistinctFromPatientId:'GASI-PT-OLD',center:'Centro ficticio Madrid 01',level:2,summary:'Persona distinta confirmada'});
    expect(result).toEqual({ok:true,episode});
  });

  test('minimiza errores del backend y solo devuelve candidato seguro de duplicado', async () => {
    const candidate={id:'GASI-PT-1',medical_record_number:'GASI-HC-1'};
    const api={createEpisode:jest.fn().mockRejectedValue({code:'patient_identifier_conflict',data:{candidate},clinicalPayload:'NO_PROPAGAR'})};
    const result=await createAuthoritativeNurseEpisode({api,session:nurseSession,patientId,center:'Centro ficticio Madrid 01',level:3,summary:'Situación clínica sintética.'});
    expect(result).toEqual({ok:false,errorCode:'patient_identifier_conflict',candidate});
    expect(result.clinicalPayload).toBeUndefined();
  });
});
