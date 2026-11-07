import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, ArrowRight } from 'lucide-react';

const Servicios = () => {
  const services = [
    {
      icon: Building2,
      title: 'Asistencia Sanitaria Integral para Empresas',
      description: 'Diseñamos soluciones de asistencia sanitaria para el entorno de trabajo, integrando atención profesional y coordinación asistencial según las necesidades de cada organización.',
      benefits: ['Atención sanitaria en el entorno de trabajo', 'Coordinación asistencial', 'Organización adaptada al centro', 'Propuesta y alcance definidos con cada cliente'],
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1100&q=85',
      link: '/cobertura-sanitaria'
    },
    {
      icon: GraduationCap,
      title: 'Formación Sanitaria',
      description: 'Formación práctica para empresas en primeros auxilios, reanimación cardiopulmonar, soporte vital básico y uso de desfibriladores.',
      benefits: ['Primeros auxilios', 'Reanimación cardiopulmonar y soporte vital básico', 'Uso de desfibriladores', 'Formación adaptada a cada organización'],
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1100&q=85',
      link: '/formacion-sanitaria'
    }
  ];

  return (
    <div data-testid="servicios-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Nuestros Servicios</h1>
          <p className="text-xl opacity-90">Asistencia sanitaria integral como actividad principal y formación sanitaria empresarial como línea especializada</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-20">
            {services.map((service, index) => {
              const ServiceIcon = service.icon;
              return (
                <div key={service.title} className={`flex flex-col lg:flex-row gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`} data-testid={`service-section-${index}`}>
                  <div className="flex-1">
                    <div className="mb-6"><ServiceIcon className="w-16 h-16 text-[#005EB8]" aria-hidden="true" /></div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-6">{service.title}</h2>
                    <p className="text-lg text-[#64748B] mb-8 leading-relaxed">{service.description}</p>
                    <div className="mb-8">
                      <h3 className="font-bold text-[#0F172A] mb-4">Aspectos principales:</h3>
                      <ul className="space-y-2">{service.benefits.map((benefit) => (<li key={benefit} className="flex items-start gap-2"><span className="text-[#005EB8] mt-1" aria-hidden="true">✓</span><span className="text-[#64748B]">{benefit}</span></li>))}</ul>
                    </div>
                    <Link to={service.link} className="inline-flex bg-[#005EB8] hover:bg-[#004a92] text-white px-6 py-3 rounded-lg font-semibold items-center gap-2 transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005EB8]" data-testid={`service-cta-${index}`}>Ver más detalles <ArrowRight className="w-5 h-5" aria-hidden="true" /></Link>
                  </div>
                  <div className="flex-1 w-full"><img src={service.image} alt={service.title} loading="lazy" className="rounded-2xl shadow-xl w-full h-[400px] object-cover" /></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">¿Necesita una configuración adaptada a su centro?</h2>
          <p className="text-xl mb-8 opacity-90">Cuéntenos sus necesidades y confirmaremos si encajan en los servicios actuales y qué alcance puede asumir GASI antes de cualquier prestación.</p>
          <Link to="/contacto" className="inline-block bg-white text-[#005EB8] hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" data-testid="cta-contact">Solicitar Información</Link>
        </div>
      </section>
    </div>
  );
};

export default Servicios;
