import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, GraduationCap, Stethoscope, CheckCircle, Users, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Home = () => {
  const services = [
    {
      icon: <Building2 className="w-12 h-12 text-[#005EB8]" />,
      title: 'Cobertura Sanitaria en Empresas',
      description: 'Personal sanitario cualificado trabajando en sus instalaciones. Atención preventiva y primeros auxilios para sus trabajadores.',
      link: '/cobertura-sanitaria',
      image: 'https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/c29a6c5d_1.png'
    },
    {
      icon: <GraduationCap className="w-12 h-12 text-[#005EB8]" />,
      title: 'Formación Sanitaria',
      description: 'Cursos especializados en primeros auxilios, RCP, soporte vital básico y actuación ante emergencias en el entorno laboral.',
      link: '/formacion-sanitaria',
      image: 'https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/np9q6v5h_2.png'
    },
    {
      icon: <Stethoscope className="w-12 h-12 text-[#005EB8]" />,
      title: 'Salud Laboral y Reconocimientos',
      description: 'Reconocimientos médicos laborales, chequeos preventivos y campañas de salud adaptadas a su empresa.',
      link: '/salud-laboral',
      image: 'https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/cokq50xq_download.png'
    }
  ];

  const sectors = [
    { name: 'Logística y Distribución', icon: '📦' },
    { name: 'Industria', icon: '⚙️' },
    { name: 'Retail y Grandes Superficies', icon: '🏪' },
    { name: 'Centros de Trabajo', icon: '🏢' }
  ];

  const advantages = [
    { icon: <Users className="w-6 h-6" />, title: 'Personal Cualificado', desc: 'Profesionales sanitarios altamente capacitados' },
    { icon: <Clock className="w-6 h-6" />, title: 'Disponibilidad Flexible', desc: 'Adaptamos nuestros servicios a su horario' },
    { icon: <Award className="w-6 h-6" />, title: 'Certificaciones Oficiales', desc: 'Formación homologada y reconocida' },
    { icon: <CheckCircle className="w-6 h-6" />, title: 'Cumplimiento Normativo', desc: 'Aseguramos el cumplimiento legal sanitario' }
  ];

  return (
    <div data-testid="home-page">
      <section className="relative h-[600px] flex items-center justify-center bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url(https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/c29a6c5d_1.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" data-testid="hero-title">
            Servicios Sanitarios Profesionales para su Empresa
          </h1>
          <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            GASI es su socio de confianza en salud laboral. Ofrecemos cobertura sanitaria interna, formación especializada y reconocimientos médicos adaptados a las necesidades de su organización.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto">
              <Button 
                size="lg" 
                className="bg-white text-[#005EB8] hover:bg-gray-100 text-lg px-8"
                data-testid="hero-cta-contact"
              >
                Solicitar Información <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/servicios">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8] text-lg px-8"
                data-testid="hero-cta-services"
              >
                Ver Servicios
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4" data-testid="services-section-title">
              Nuestros Servicios Principales
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Soluciones sanitarias integrales diseñadas específicamente para empresas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Link to={service.link} key={index} className="group" data-testid={`service-card-${index}`}>
                <Card className="h-full hover-lift border-2 border-transparent hover:border-[#005EB8] transition-all">
                  <div className="h-48 overflow-hidden rounded-t-lg">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      {service.icon}
                    </div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-3 group-hover:text-[#005EB8] transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-[#64748B] mb-4">
                      {service.description}
                    </p>
                    <div className="flex items-center text-[#005EB8] font-semibold group-hover:translate-x-2 transition-transform">
                      Más información <ArrowRight className="ml-2 w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Sectores Empresariales
            </h2>
            <p className="text-lg text-[#64748B]">
              Trabajamos con empresas líderes en diversos sectores
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sectors.map((sector, index) => (
              <Card key={index} className="text-center p-8 hover-lift" data-testid={`sector-card-${index}`}>
                <div className="text-5xl mb-4">{sector.icon}</div>
                <h3 className="font-semibold text-[#0F172A]">{sector.name}</h3>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/sectores">
              <Button size="lg" className="bg-[#005EB8] hover:bg-[#004a92] text-white" data-testid="sectors-cta">
                Ver Todos los Sectores
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              ¿Por qué Elegir GASI?
            </h2>
            <p className="text-lg text-[#64748B]">
              Ventajas competitivas que nos hacen su mejor opción
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {advantages.map((adv, index) => (
              <div key={index} className="text-center" data-testid={`advantage-${index}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">
                  {adv.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] mb-2">{adv.title}</h3>
                <p className="text-[#64748B] text-sm">{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            ¿Listo para Mejorar la Salud Laboral de su Empresa?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Contáctenos hoy y descubra cómo GASI puede ayudarle
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto">
              <Button 
                size="lg" 
                className="bg-white text-[#005EB8] hover:bg-gray-100 text-lg px-8"
                data-testid="cta-contact-bottom"
              >
                Solicitar Presupuesto
              </Button>
            </Link>
            <a href="tel:622822101">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8] text-lg px-8"
                data-testid="cta-call"
              >
                Llamar Ahora: 622 822 101
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;