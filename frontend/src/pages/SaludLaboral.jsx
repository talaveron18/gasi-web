import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Heart, Users, Stethoscope, Brain, GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SaludLaboral = () => {
  const services = [
    { icon: <Activity className="w-8 h-8" />, title: 'Enfermería presencial', desc: 'Cobertura enfermera en el centro o dispositivo definido para el servicio.' },
    { icon: <Stethoscope className="w-8 h-8" />, title: 'Apoyo médico remoto', desc: 'Apoyo médico remoto asociado cuando el servicio y la autorización aplicable lo permitan.' },
    { icon: <Heart className="w-8 h-8" />, title: 'Fisioterapia', desc: 'Atención de fisioterapia dentro del alcance contratado y autorizado.' },
    { icon: <Brain className="w-8 h-8" />, title: 'Psicología', desc: 'Atención psicológica dentro del alcance contratado y autorizado.' },
    { icon: <GraduationCap className="w-8 h-8" />, title: 'Formación sanitaria', desc: 'Formación sanitaria adaptada a las necesidades acordadas con cada organización.' },
    { icon: <Users className="w-8 h-8" />, title: 'Coordinación asistencial', desc: 'Organización de los recursos sanitarios incluidos en el servicio contratado.' }
  ];

  return (
    <div data-testid="salud-laboral-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Servicios sanitarios para organizaciones
          </h1>
          <p className="text-xl opacity-90">
            Recursos sanitarios adaptados a cada servicio y sujetos a la habilitación o autorización que corresponda.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Cobertura sanitaria adaptada a cada organización</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            GASI organiza servicios de enfermería presencial y, cuando proceda, apoyo médico remoto asociado, fisioterapia, psicología y formación sanitaria. La configuración concreta se define para cada cliente y centro antes del inicio del servicio.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed">
            GASI no presta servicios de prevención ajeno ni atribuye a esta oferta la vigilancia de la salud, los reconocimientos médicos laborales, la evaluación de riesgos o la gestión de bajas. La disponibilidad de cada actividad sanitaria está condicionada a los requisitos profesionales y administrativos aplicables al servicio y al lugar de prestación.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-12 text-center">
            Líneas de servicio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Cuéntenos qué cobertura necesita</h2>
          <p className="text-lg text-[#64748B] mb-8">
            Revisaremos el centro, el alcance y los recursos necesarios antes de confirmar la configuración del servicio.
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
