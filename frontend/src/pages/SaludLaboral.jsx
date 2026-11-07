import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, GraduationCap, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

const SaludLaboral = () => {
  const services = [
    { icon: <Activity className="w-8 h-8" />, title: 'Enfermería presencial', desc: 'Atención de enfermería en el centro de trabajo, con funciones y horarios acordados previamente.' },
    { icon: <GraduationCap className="w-8 h-8" />, title: 'Formación sanitaria empresarial', desc: 'Primeros auxilios, reanimación cardiopulmonar, soporte vital básico y uso de desfibriladores.' },
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
            Enfermería presencial para empresas y formación práctica en primeros auxilios, reanimación cardiopulmonar y uso de desfibriladores.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Soluciones sanitarias adaptadas a cada organización</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            GASI estudia servicios de enfermería presencial en centros de trabajo, con horarios, funciones y recursos definidos junto a cada organización. Además, desarrolla formación empresarial en primeros auxilios, reanimación cardiopulmonar y uso de desfibriladores.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed">
            Nos adaptamos a la actividad y organización de cada centro para preparar una propuesta clara de enfermería presencial o formación sanitaria. Antes de ponerla en marcha, concretamos los recursos, las funciones y los requisitos aplicables.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-12 text-center">
            Nuestras líneas de servicio
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
            Explíquenos qué necesita su organización y prepararemos una propuesta ajustada a su actividad, previa comprobación de su viabilidad y requisitos.
          </p>
          <Link to="/contacto" className="inline-flex items-center justify-center rounded-md bg-[#005EB8] px-6 py-3 text-white font-medium hover:bg-[#004A92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005EB8]" data-testid="cta-contact">
            Solicitar información
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SaludLaboral;
