import React from 'react';
import { Card } from '@/components/ui/card';

const Sectores = () => {
  const sectors = [
    {
      icon: '📦',
      title: 'Logística y Distribución',
      description: 'Podemos estudiar necesidades de cobertura sanitaria presencial en centros logísticos, almacenes y plataformas de distribución.',
    },
    {
      icon: '⚙️',
      title: 'Industria y Producción',
      description: 'Valoramos necesidades de enfermería presencial y formación sanitaria en centros industriales y de producción.',
    },
    {
      icon: '🏪',
      title: 'Retail y Grandes Superficies',
      description: 'Analizamos necesidades sanitarias presenciales y formativas en centros comerciales y grandes superficies.',
    },
    {
      icon: '🏢',
      title: 'Centros de Trabajo y Oficinas',
      description: 'Podemos valorar cobertura de enfermería presencial y acciones de formación sanitaria para centros de trabajo y oficinas.',
    },
    {
      icon: '🏭',
      title: 'Construcción y Obras',
      description: 'Estudiamos cada solicitud para determinar si la cobertura sanitaria requerida puede prestarse dentro del alcance aplicable.',
    },
    {
      icon: '🛍️',
      title: 'Hostelería y Turismo',
      description: 'Podemos revisar necesidades de enfermería presencial y formación sanitaria en establecimientos de hostelería y turismo.',
    }
  ];

  return (
    <div data-testid="sectores-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Sectores empresariales
          </h1>
          <p className="text-xl opacity-90">
            Estudiamos cada necesidad antes de confirmar el alcance de la prestación
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-4">
              Ámbitos en los que podemos valorar necesidades
            </h2>
            <p className="text-lg text-[#64748B] max-w-3xl mx-auto">
              El sector no determina por sí solo la disponibilidad del servicio. GASI revisa la necesidad concreta y confirma previamente si puede atenderla, con qué profesionales y bajo qué alcance y requisitos aplicables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, index) => (
              <Card key={index} className="p-8 hover-lift" data-testid={`sector-card-${index}`}>
                <div className="text-6xl mb-4 text-center">{sector.icon}</div>
                <h3 className="text-2xl font-bold text-[#0F172A] mb-4 text-center">
                  {sector.title}
                </h3>
                <p className="text-[#64748B]">
                  {sector.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">
            ¿Necesita valorar una cobertura concreta?
          </h2>
          <p className="text-lg text-[#64748B] mb-8">
            Cuéntenos la necesidad. Antes de asumir cualquier prestación, confirmaremos si GASI puede atenderla y el alcance aplicable.
          </p>
          <a href="/contacto">
            <button className="bg-[#005EB8] hover:bg-[#004a92] text-white px-8 py-3 rounded-lg font-semibold text-lg" data-testid="cta-contact">
              Solicitar información
            </button>
          </a>
        </div>
      </section>
    </div>
  );
};

export default Sectores;
