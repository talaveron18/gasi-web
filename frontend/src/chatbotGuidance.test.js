import { interpretQuestion, composeLeadMessage, TOPICS, SERVICES } from './lib/chatbotGuidance';

describe('professional GASI chatbot guidance', () => {
  test('prefills training quote without inventing a tariff', () => {
    const result = interpretQuestion('¿Cuánto cuesta un curso de RCP para 20 empleados en Madrid?');
    expect(result.type).toBe('price');
    expect(result.topic.service).toBe('Formación sanitaria');
    expect(result.city).toBe('Madrid');
    expect(result.count).toBe('20');
    expect(result.answer).toContain('20 personas');
    expect(result.answer).toContain('Madrid');
    expect(result.answer).toContain('no publica una tarifa cerrada');
    expect(result.topic.url).toBe('/formacion-sanitaria');
  });

  test('gives grounded service-specific answers and live page links', () => {
    expect(interpretQuestion('Necesito enfermería para mi empresa').topic.url).toBe('/cobertura-sanitaria');
    expect(interpretQuestion('¿Impartís primeros auxilios y DEA?').topic.url).toBe('/formacion-sanitaria');
    expect(TOPICS).toHaveLength(4);
    expect(TOPICS.every(t => SERVICES.includes(t.service))).toBe(true);
    expect(TOPICS.every(t => ['/cobertura-sanitaria', '/formacion-sanitaria'].includes(t.url))).toBe(true);
  });

  test('routes health and emergency questions away from the sales form', () => {
    const result = interpretQuestion('Mi paciente tiene síntomas preocupantes, ¿qué hago?');
    expect(result.type).toBe('clinical');
    expect(result.question).toBe('');
    expect(result.answer).toContain('112');
    expect(result.topic).toBeNull();
  });

  test('builds a concise commercial-only request, preserving useful details', () => {
    const message = composeLeadMessage({
      service_detail: 'Curso de RCP y DEA',
      timeframe: 'Próximo trimestre',
      message: '20 empleados en dos grupos'
    }, '¿Cuánto cuesta para 20 empleados?');
    expect(message).toContain('Pregunta original');
    expect(message).toContain('Plazo orientativo: Próximo trimestre');
    expect(message).toContain('20 empleados en dos grupos');
    expect(message.length).toBeLessThanOrEqual(1400);
  });
});
