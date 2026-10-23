import React from 'react';
import { Card } from '@/components/ui/card';

const Sectores = () => {
  const sectors = [
    {
      icon: '📦',
      title: 'Logística y Distribución',
      description: 'Centros logísticos, almacenes y plataformas de distribución pueden requerir recursos sanitarios adaptados a su actividad, turnos y características del centro.',
      needs: ['Enfermería presencial cuando proceda', 'Cobertura adaptada al centro', 'Formación sanitaria según necesidad']
    },
    {
      icon: '⚙️',
      title: 'Industria y Manufactura',
      description: 'Plantas industriales, fábricas y centros de producción pueden configurar servicios sanitarios de acuerdo con sus necesidades y con el alcance autorizado.',
      needs: ['Enfermería presencial cuando proceda', 'Configuración según el centro', 'Formación sanitaria según necesidad']
    },
    {
      icon: '🏪',
      title: 'Retail y Grandes Superficies',
      description: 'Centros comerciales, hipermercados y grandes superficies pueden requerir cobertura sanitaria adaptada a sus instalaciones y actividad.',
      needs: ['Enfermería presencial cuando proceda', 'Cobertura adaptada al centro', 'Formación sanitaria según necesidad']
    },
    {
      icon: '🏢',
      title: 'Centros de Trabajo y Oficinas',
      description: 'Centros corporativos, campus empresariales y oficinas pueden configurar recursos sanitarios según sus necesidades y las características de cada centro.',
      needs: ['Cobertura sanitaria configurable', 'Recursos definidos antes del inicio', 'Formación sanitaria según necesidad']
    },
    {
      icon: '🏭',
      title: 'Construcción y Obras',
      description: 'Proyectos de obra y construcción pueden plantear necesidades de cobertura sanitaria que deben definirse específicamente para cada servicio y ubicación.',
      needs: ['Cobertura sanitaria cuando proceda', 'Configuración según el servicio', 'Formación sanitaria según necesidad']
    },
    {
      icon: '🛍️',
      title: 'Hostelería y Turismo',
      description: 'Hoteles, restauración y complejos turísticos pueden requerir recursos sanitarios configurados de acuerdo con su actividad y necesidades concretas.',
      needs: ['Cobertura sanitaria configurable', 'Recursos según necesidad', 'Formación sanitaria según necesidad']
    }
  ];

  return (
    <div data-testid="sectores-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Sectores Empresariales</h1>
          <p className="text-xl opacity-90">Ámbitos en los que puede estudiarse una configuración sanitaria adaptada a cada centro</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-4">Necesidades diferentes según el sector</h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Cada servicio se estudia de forma individual. La disponibilidad y el alcance se confirman antes del inicio y quedan sujetos a los requisitos profesionales y administrativos aplicables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, index) => (
              <Card key={index} className="p-8 hover-lift" data-testid={`sector-card-${index}`}>
                <div className="text-6xl mb-4 text-center">{sector.icon}</div>
                <h3 className="text-2xl font-bold text-[#0F172A] mb-4 text-center">{sector.title}</h3>
                <p className="text-[#64748B] mb-6">{sector.description}</p>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-[#0F172A] mb-3 text-sm">Posibles necesidades:</h4>
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
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">¿Su sector no aparece aquí?</h2>
          <p className="text-lg text-[#64748B] mb-8">Cuéntenos las características de su organización y revisaremos si podemos plantear una configuración adecuada.</p>
          <a href="/contacto">
            <button className="bg-[#005EB8] hover:bg-[#004a92] text-white px-8 py-3 rounded-lg font-semibold text-lg" data-testid="cta-contact">Solicitar información</button>
          </a>
        </div>
      </section>
    </div>
  );
};

export default Sectores;
