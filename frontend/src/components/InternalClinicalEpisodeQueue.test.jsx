import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InternalClinicalEpisodeQueue from './InternalClinicalEpisodeQueue';

const noop = () => {};

const episode = (id, status) => ({
  id,
  center: 'CENTRO-SINTETICO-01',
  level: 2,
  status,
});

describe('InternalClinicalEpisodeQueue', () => {
  test('separa ABIERTO y RESPONDIDO como pendientes y CERRADO como histórico', () => {
    const html = renderToStaticMarkup(
      <InternalClinicalEpisodeQueue
        episodes={[
          episode('CASE-SYN-OPEN', 'ABIERTO'),
          episode('CASE-SYN-ANSWERED', 'RESPONDIDO'),
          episode('CASE-SYN-CLOSED', 'CERRADO'),
        ]}
        selectedId="CASE-SYN-ANSWERED"
        onSelect={noop}
      />,
    );

    expect(html).toContain('Pendientes');
    expect(html).toContain('Histórico cerrado');
    expect(html).toContain('CASE-SYN-OPEN');
    expect(html).toContain('CASE-SYN-ANSWERED');
    expect(html).toContain('CASE-SYN-CLOSED');
  });

  test('omite estados desconocidos de ambas colas de forma fail-closed', () => {
    const html = renderToStaticMarkup(
      <InternalClinicalEpisodeQueue
        episodes={[
          episode('CASE-SYN-OPEN', 'ABIERTO'),
          episode('CASE-SYN-UNKNOWN', 'ESTADO_NO_RECONOCIDO'),
        ]}
        selectedId="CASE-SYN-OPEN"
        onSelect={noop}
      />,
    );

    expect(html).toContain('CASE-SYN-OPEN');
    expect(html).not.toContain('CASE-SYN-UNKNOWN');
    expect(html).not.toContain('ESTADO_NO_RECONOCIDO');
  });

  test('expone semántica y estado de selección accesibles en la cola real', () => {
    const html = renderToStaticMarkup(
      <InternalClinicalEpisodeQueue
        episodes={[episode('CASE-SYN-OPEN', 'ABIERTO'), episode('CASE-SYN-CLOSED', 'CERRADO')]}
        selectedId="CASE-SYN-OPEN"
        onSelect={noop}
      />,
    );

    expect(html).toContain('aria-label="Cola de episodios clínicos"');
    expect(html).toContain('aria-label="Episodios pendientes"');
    expect(html).toContain('aria-label="Histórico de episodios cerrados"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Episodio CASE-SYN-OPEN, centro CENTRO-SINTETICO-01, prioridad N2, estado ABIERTO"');
    expect(html).toContain('focus-visible:ring-2');
  });

  test('presenta vacíos explícitos sin inventar episodios', () => {
    const html = renderToStaticMarkup(
      <InternalClinicalEpisodeQueue episodes={[]} selectedId={null} onSelect={noop} />,
    );

    expect(html).toContain('No hay casos pendientes.');
    expect(html).toContain('No hay casos cerrados visibles.');
  });
});
