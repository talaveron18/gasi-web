import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, GraduationCap, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SaludLaboral = () => {
  const services = [
    { icon: <Activity className="w-8 h-8" />, title: 'Enfermería presencial', desc: 'Cobertura enfermera en el centro o dispositivo definido, dentro del alcance previamente acordado y aplicable.' },
    { icon: <GraduationCap className="w-8 h-8" />, title: 'Formación sanitaria', desc: 'Acciones formativas sanitarias cuya disponibilidad, contenido y formato se confirman previamente.' },
    { icon: <ClipboardCheck className="w-8 h-8" />, title: 'Alcance definido', desc: 'Antes del inicio se concretan el servicio, los recursos y las condiciones que GASI puede asumir.' }
  ];

  return (
    <div data-testid="salud-laboral-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Servicios sanitarios para organizaciones
          </h1>
          <p className="text-xl opacity-90">
            Enfermería presencial y formación sanitaria, con alcance sujeto a confirmación previa y a los requisitos aplicables.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Cobertura sanitaria con alcance definido</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            GASI puede organizar servicios de enfermería presencial y acciones de formación sanitaria. La configuración concreta se revisa para cada necesidad antes de confirmar la prestación.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed">
            Esta oferta no incluye vigilancia de la salud, reconocimientos médicos laborales, evaluación de riesgos ni gestión de bajas. La disponibilidad de cada actividad está condicionada al alcance acordado y a los requisitos profesionales y administrativos aplicables.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-12 text-center">
            Alcance público actual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="p-6 hover-lift" data-testid={`service-${index}`}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">
                  {service.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] mb-2">{service.title}</h3>
                <p className="text-[#64748B] text-sm">{service.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Cuéntenos qué necesita</h2>
          <p className="text-lg text-[#64748B] mb-8">
            Revisaremos la necesidad y confirmaremos si GASI puede atenderla y bajo qué alcance antes de cualquier prestación.
          </p>
          <Link to="/contacto">
            <Button size="lg" className="bg-[#005EB8] text-white hover:bg-[#004A92]" data-testid="cta-contact">
              Solicitar información
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SaludLaboral;
