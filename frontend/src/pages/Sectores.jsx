import React from 'react';
import { Card } from '@/components/ui/card';

const Sectores = () => {
  const sectors = [
    {
      icon: '📦',
      title: 'Logística y Distribución',
      description: 'Servicios sanitarios para centros logísticos, almacenes y plataformas de distribución. Trabajamos con líderes como Amazon, GXO, DHL y otros grandes operadores logísticos.',
      needs: ['Cobertura sanitaria 24/7', 'Formación en prevención', 'Atención rápida en turno']
    },
    {
      icon: '⚙️',
      title: 'Industria y Manufactura',
      description: 'Soluciones para plantas industriales, fábricas y centros de producción. Entendemos los riesgos del sector industrial y ofrecemos respuesta preventiva y reactiva.',
      needs: ['Personal sanitario in situ', 'Reconocimientos específicos', 'Formación adaptada a riesgos']
    },
    {
      icon: '🏪',
      title: 'Retail y Grandes Superficies',
      description: 'Servicios para centros comerciales, hipermercados y grandes superficies como Leroy Merlin, Decathlon, Carrefour y similares.',
      needs: ['Enfermería laboral', 'Atención preventiva', 'Reconocimientos periódicos']
    },
    {
      icon: '🏢',
      title: 'Centros de Trabajo y Oficinas',
      description: 'Cobertura sanitaria para grandes empresas con alta concentración de trabajadores en centros corporativos, campus empresariales y oficinas.',
      needs: ['Sala sanitaria interna', 'Campañas de salud', 'Formación básica']
    },
    {
      icon: '🏭',
      title: 'Construcción y Obras',
      description: 'Servicios especializados para empresas constructoras, ingenierías y proyectos de obra con necesidades sanitarias específicas del sector.',
      needs: ['Cobertura en obra', 'Formación en riesgos', 'Reconocimientos obligatorios']
    },
    {
      icon: '🛍️',
      title: 'Hostelería y Turismo',
      description: 'Soluciones sanitarias para hoteles, restaurantes, cadenas de hostelería y complejos turísticos con necesidades de salud laboral.',
      needs: ['Personal disponible', 'Formación en higiene', 'Chequeos regulares']
    }
  ];

  return (
    <div data-testid="sectores-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Sectores Empresariales
          </h1>
          <p className="text-xl opacity-90">
            Servicios sanitarios especializados para cada sector
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-4">
              Experiencia en Múltiples Sectores
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Entendemos las necesidades únicas de cada sector y adaptamos nuestros servicios para ofrecer soluciones eficaces y personalizadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, index) => (
              <Card key={index} className="p-8 hover-lift" data-testid={`sector-card-${index}`}>
                <div className="text-6xl mb-4 text-center">{sector.icon}</div>
                <h3 className="text-2xl font-bold text-[#0F172A] mb-4 text-center">
                  {sector.title}
                </h3>
                <p className="text-[#64748B] mb-6">
                  {sector.description}
                </p>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-[#0F172A] mb-3 text-sm">Necesidades comunes:</h4>
                  <ul className="space-y-1 text-sm">
                    {sector.needs.map((need, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#005EB8] mt-0.5">✓</span>
                        <span className="text-[#64748B]">{need}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">
            ¿Su sector no aparece aquí?
          </h2>
          <p className="text-lg text-[#64748B] mb-8">
            Trabajamos con empresas de todos los sectores. Contáctenos y le explicaremos cómo podemos ayudarle.
          </p>
          <a href="/contacto">
            <button className="bg-[#005EB8] hover:bg-[#004a92] text-white px-8 py-3 rounded-lg font-semibold text-lg" data-testid="cta-contact">
              Contactar con GASI
            </button>
          </a>
        </div>
      </section>
    </div>
  );
};

export default Sectores;