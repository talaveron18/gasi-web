import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InternalClinicalEpisodeActions, {
  confirmClinicalEpisodeClosure,
} from './InternalClinicalEpisodeActions';

const api = {
  getEpisode: jest.fn(),
  respond: jest.fn(),
  addAddendum: jest.fn(),
  changeLevel: jest.fn(),
  recordDisposition: jest.fn(),
  reviewLateResponse: jest.fn(),
  advanceMessage: jest.fn(),
  recordDeliveryState: jest.fn(),
  closeEpisode: jest.fn(),
};

const episode = {
  id: 'CASE-SYN-A11Y-01',
  center: 'CENTRO-SINTETICO-01',
  discipline: 'nursing',
  level: 2,
  status: 'RESPONDIDO',
  responses: [],
  deliveryHistory: [],
};

const session = {
  id: 'USER-SYN-NURSE-01',
  role: 'nurse',
  centers: ['CENTRO-SINTETICO-01'],
};

describe('InternalClinicalEpisodeActions accessibility', () => {
  test('la interfaz clínica real conserva foco visible, etiquetas y estado de ocupación', () => {
    const html = renderToStaticMarkup(
      <InternalClinicalEpisodeActions
        episode={episode}
        session={session}
        api={api}
        onUpdate={() => {}}
      />,
    );

    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('Nivel de prioridad');
    expect(html).toContain('Anotación / adenda');
    expect(html).toContain('Cerrar episodio');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('type="checkbox"');
  });

  test('el cierre clínico exige confirmación explícita y respeta cancelación', () => {
    const cancel = jest.fn(() => false);
    const accept = jest.fn(() => true);

    expect(confirmClinicalEpisodeClosure(cancel)).toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel.mock.calls[0][0]).toContain('cerrar el episodio clínico');

    expect(confirmClinicalEpisodeClosure(accept)).toBe(true);
    expect(accept).toHaveBeenCalledTimes(1);
  });
});
