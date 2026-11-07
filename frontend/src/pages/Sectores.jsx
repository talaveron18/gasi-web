import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

const Sectores = () => {
  const sectors = [
    {
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=85',
      imageAlt: 'Centro logístico con estanterías de almacenaje',
      title: 'Logística y Distribución',
      description: 'Podemos estudiar necesidades de cobertura sanitaria presencial en centros logísticos, almacenes y plataformas de distribución.',
    },
    {
      image: 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?auto=format&fit=crop&w=1000&q=85',
      imageAlt: 'Robots industriales en una línea de producción de automóviles',
      title: 'Industria y Producción',
      description: 'Valoramos necesidades de enfermería presencial y formación sanitaria en centros industriales y de producción.',
    },
    {
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=85',
      imageAlt: 'Interior de un establecimiento comercial',
      title: 'Retail y Grandes Superficies',
      description: 'Analizamos necesidades sanitarias presenciales y formativas en centros comerciales y grandes superficies.',
    },
    {
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',
      imageAlt: 'Espacio de oficinas',
      title: 'Centros de Trabajo y Oficinas',
      description: 'Podemos valorar cobertura de enfermería presencial y acciones de formación sanitaria para centros de trabajo y oficinas.',
    },
    {
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=85',
      imageAlt: 'Obra de construcción',
      title: 'Construcción y Obras',
      description: 'Estudiamos cada solicitud para determinar si la cobertura sanitaria requerida puede prestarse dentro del alcance aplicable.',
    },
    {
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85',
      imageAlt: 'Interior de un establecimiento de hostelería',
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
            Consultas sobre enfermería presencial y formación sanitaria para distintos sectores
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-4">
              Estudiamos necesidades de cada sector
            </h2>
            <p className="text-lg text-[#64748B] max-w-3xl mx-auto">
              Cada organización tiene necesidades distintas. Podemos estudiar solicitudes de enfermería presencial y formación sanitaria, sin presuponer disponibilidad ni capacidad para atender todos los sectores. Cada propuesta depende de su viabilidad, los recursos y los requisitos aplicables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, index) => (
              <Card key={index} className="overflow-hidden hover-lift h-full" data-testid={`sector-card-${index}`}>
                <div className="h-52 overflow-hidden bg-[#EAF4FC]"><img src={sector.image} alt={sector.imageAlt} loading="lazy" decoding="async" className="w-full h-full object-cover" /></div>
                <div className="p-8">
                <h3 className="text-2xl font-bold text-[#0F172A] mb-4 text-center">
                  {sector.title}
                </h3>
                <p className="text-[#64748B]">
                  {sector.description}
                </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">
            Hablemos de las necesidades de su empresa
          </h2>
          <p className="text-lg text-[#64748B] mb-8">
            Cuéntenos si necesita enfermería presencial o formación sanitaria. Revisaremos el encaje y los requisitos aplicables antes de confirmar cualquier propuesta.
          </p>
          <Link to="/contacto" className="inline-flex items-center justify-center bg-[#005EB8] hover:bg-[#004a92] text-white px-8 py-3 rounded-lg font-semibold text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005EB8]" data-testid="cta-contact">
            Solicitar información
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Sectores;
