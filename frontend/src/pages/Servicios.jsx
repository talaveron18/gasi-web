import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, Stethoscope, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Servicios = () => {
  const services = [
    {
      icon: <Building2 className="w-16 h-16 text-[#005EB8]" />,
      title: 'Cobertura Sanitaria en Empresas',
      description: 'Personal sanitario cualificado trabajando directamente en sus instalaciones. Proporcionamos enfermería laboral, primeros auxilios y atención preventiva adaptada a su centro de trabajo.',
      benefits: ['Atención inmediata in situ', 'Reducción de bajas laborales', 'Cumplimiento normativo', 'Flexibilidad horaria'],
      link: '/cobertura-sanitaria',
      image: 'https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/c29a6c5d_1.png'
    },
    {
      icon: <GraduationCap className="w-16 h-16 text-[#005EB8]" />,
      title: 'Formación Sanitaria',
      description: 'Cursos especializados en primeros auxilios, RCP, soporte vital básico y actuación ante emergencias en el entorno laboral. Formación práctica, homologada y adaptada a su sector.',
      benefits: ['Cursos presenciales y online', 'Certificaciones oficiales', 'Personal cualificado', 'Formación práctica'],
      link: '/formacion-sanitaria',
      image: 'https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/np9q6v5h_2.png'
    },
    {
      icon: <Stethoscope className="w-16 h-16 text-[#005EB8]" />,
      title: 'Salud Laboral y Reconocimientos',
      description: 'Reconocimientos médicos laborales obligatorios, chequeos preventivos y campañas de salud corporativa. Cuidamos la salud de sus trabajadores de forma integral.',
      benefits: ['Reconocimientos completos', 'Informes detallados', 'Campañas preventivas', 'Gestión administrativa'],
      link: '/salud-laboral',
      image: 'https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/cokq50xq_download.png'
    }
  ];

  return (
    <div data-testid="servicios-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Nuestros Servicios
          </h1>
          <p className="text-xl opacity-90">
            Soluciones sanitarias integrales para empresas modernas
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-20">
            {services.map((service, index) => (
              <div 
                key={index} 
                className={`flex flex-col lg:flex-row gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                data-testid={`service-section-${index}`}
              >
                <div className="flex-1">
                  <div className="mb-6">
                    {service.icon}
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-6">
                    {service.title}
                  </h2>
                  <p className="text-lg text-[#64748B] mb-8 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="mb-8">
                    <h3 className="font-bold text-[#0F172A] mb-4">Beneficios clave:</h3>
                    <ul className="space-y-2">
                      {service.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#005EB8] mt-1">✓</span>
                          <span className="text-[#64748B]">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link to={service.link}>
                    <button className="bg-[#005EB8] hover:bg-[#004a92] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5" data-testid={`service-cta-${index}`}>
                      Ver más detalles <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                </div>

                <div className="flex-1">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="rounded-2xl shadow-xl w-full h-[400px] object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            ¿Necesita un servicio personalizado?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Contáctenos y diseñaremos una solución adaptada a su empresa
          </p>
          <Link to="/contacto">
            <button className="bg-white text-[#005EB8] hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg" data-testid="cta-contact">
              Solicitar Información
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Servicios;