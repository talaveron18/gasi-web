import { assertSyntheticClinicalInput, isExplicitlySyntheticReference } from './syntheticDataGuard';

describe('syntheticDataGuard', () => {
  test('acepta referencias inequívocamente sintéticas', () => {
    expect(isExplicitlySyntheticReference('PAT-DEMO-001')).toBe(true);
    expect(assertSyntheticClinicalInput({ patientRef: 'PAT-DEMO-001', center: 'Centro ficticio Madrid 01' })).toEqual({ ok: true });
  });

  test('bloquea referencias que podrían corresponder a una persona real', () => {
    expect(assertSyntheticClinicalInput({ patientRef: '12345678Z', center: 'Centro ficticio Madrid 01' })).toEqual({ ok: false, errorCode: 'real_data_activation_blocked' });
  });

  test('bloquea centros no marcados como sintéticos', () => {
    expect(assertSyntheticClinicalInput({ patientRef: 'PAT-DEMO-001', center: 'Hospital Central' })).toEqual({ ok: false, errorCode: 'real_data_activation_blocked' });
  });
});
