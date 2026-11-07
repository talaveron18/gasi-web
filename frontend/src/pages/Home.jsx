import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, GraduationCap, CheckCircle, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Home = () => {
  const services = [
    {
      icon: <Building2 className="w-12 h-12 text-[#005EB8]" />,
      title: 'Asistencia Sanitaria Integral',
      description: 'Propuestas de enfermería presencial para organizaciones, con funciones, horarios y recursos sujetos a valoración y acuerdo previo.',
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=85",
      link: '/cobertura-sanitaria'
    },
    {
      icon: <GraduationCap className="w-12 h-12 text-[#005EB8]" />,
      title: 'Formación Sanitaria',
      description: 'Primeros auxilios, reanimación cardiopulmonar, soporte vital básico y uso de desfibriladores para equipos de trabajo.',
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85",
      link: '/formacion-sanitaria'
    }
  ];

  const sectors = [
    { name: 'Logística y Distribución', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=85', imageAlt: 'Almacén logístico' },
    { name: 'Industria', image: 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?auto=format&fit=crop&w=900&q=85', imageAlt: 'Línea de producción industrial' },
    { name: 'Retail y Grandes Superficies', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=85', imageAlt: 'Tienda de ropa' },
    { name: 'Centros de Trabajo', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85', imageAlt: 'Oficina moderna' }
  ];

  const advantages = [
    { icon: <Users className="w-6 h-6" />, title: 'Alcance Definido', desc: 'La prestación se concreta antes del inicio según cada organización' },
    { icon: <Clock className="w-6 h-6" />, title: 'Configuración Adaptada', desc: 'Estudiamos horarios y necesidades sin presuponer disponibilidad' },
    { icon: <CheckCircle className="w-6 h-6" />, title: 'Información Clara', desc: 'Confirmamos el alcance aplicable antes de formalizar la prestación' }
  ];

  return (
    <div data-testid="home-page">
      <section className="relative min-h-[600px] py-20 flex items-center justify-center bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85)" }} aria-hidden="true" /><div className="absolute inset-0 bg-gradient-to-r from-[#073B71]/90 to-[#005EB8]/65" aria-hidden="true" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in" data-testid="hero-title">Asistencia Sanitaria Integral para Empresas</h1>
          <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-2xl mx-auto">Estudiamos necesidades de enfermería presencial y formación sanitaria para organizaciones. Cada propuesta queda sujeta a la valoración del centro, la disponibilidad efectiva y la comprobación de los requisitos aplicables antes de acordar su alcance.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto" className="inline-flex items-center justify-center rounded-md bg-white text-[#005EB8] hover:bg-gray-100 text-lg px-8 h-11 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#005EB8]" data-testid="hero-cta-contact">Solicitar Información <ArrowRight className="ml-2 w-5 h-5" /></Link>
            <Link to="/servicios" className="inline-flex items-center justify-center rounded-md bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8] text-lg px-8 h-11 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#005EB8]" data-testid="hero-cta-services">Ver Servicios</Link>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16"><h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4" data-testid="services-section-title">Nuestras soluciones</h2><p className="text-lg text-[#64748B] max-w-2xl mx-auto">Asistencia sanitaria para empresas como actividad principal y formación práctica en emergencias como línea complementaria.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {services.map((service, index) => (<Link to={service.link} key={index} className="group" data-testid={`service-card-${index}`}><Card className="h-full hover-lift border-2 border-transparent hover:border-[#005EB8] transition-all"><div className="h-48 overflow-hidden rounded-t-lg bg-[#EAF4FC]"><img src={service.image} alt={service.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div><CardContent className="p-6"><div className="mb-4">{service.icon}</div><h3 className="text-xl font-bold text-[#0F172A] mb-3 group-hover:text-[#005EB8] transition-colors">{service.title}</h3><p className="text-[#64748B] mb-4">{service.description}</p><div className="flex items-center text-[#005EB8] font-semibold group-hover:translate-x-2 transition-transform">Más información <ArrowRight className="ml-2 w-4 h-4" /></div></CardContent></Card></Link>))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-[#F8FAFC]"><div className="max-w-7xl mx-auto px-6 lg:px-8"><div className="text-center mb-16"><h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">Sectores</h2><p className="text-lg text-[#64748B]">Podemos estudiar necesidades de organizaciones de distintos sectores, sin que ello implique disponibilidad o contratación automática.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{sectors.map((sector, index) => (<Card key={index} className="overflow-hidden h-full hover-lift" data-testid={`sector-card-${index}`}><div className="h-40 overflow-hidden bg-[#EAF4FC]"><img src={sector.image} alt={sector.imageAlt} loading="lazy" decoding="async" className="w-full h-full object-cover" /></div><h3 className="font-semibold text-[#0F172A] text-center p-5">{sector.name}</h3></Card>))}</div><div className="text-center mt-12"><Link to="/sectores" className="inline-flex items-center justify-center rounded-md bg-[#005EB8] hover:bg-[#004a92] text-white px-8 h-11 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8]" data-testid="sectors-cta">Consultar sectores</Link></div></div></section>

      <section className="py-20 lg:py-24 bg-white"><div className="max-w-7xl mx-auto px-6 lg:px-8"><div className="text-center mb-16"><h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">Cómo trabajamos</h2><p className="text-lg text-[#64748B]">Primero delimitamos la necesidad y el alcance que puede prestarse.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">{advantages.map((adv, index) => (<div key={index} className="text-center" data-testid={`advantage-${index}`}><div className="inline-flex items-center justify-center w-16 h-16 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">{adv.icon}</div><h3 className="font-bold text-[#0F172A] mb-2">{adv.title}</h3><p className="text-[#64748B] text-sm">{adv.desc}</p></div>))}</div></div></section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white"><div className="max-w-4xl mx-auto px-6 text-center"><h2 className="text-3xl lg:text-4xl font-bold mb-6">¿Quiere plantearnos una necesidad?</h2><p className="text-xl mb-8 opacity-90">Envíenos la información y confirmaremos si encaja en los servicios actuales y bajo qué alcance.</p><Link to="/contacto" className="inline-flex items-center justify-center rounded-md bg-white text-[#005EB8] hover:bg-gray-100 text-lg px-8 h-11 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#005EB8]" data-testid="cta-contact-bottom">Solicitar información</Link></div></section>
    </div>
  );
};

export default Home;