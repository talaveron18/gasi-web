import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Clock, Building, CheckCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CoberturaSanitaria = () => {
  const features = [
    { icon: <Users className="w-6 h-6" />, title: 'Personal Sanitario Cualificado', desc: 'Enfermeros/as y técnicos con experiencia en salud laboral' },
    { icon: <Clock className="w-6 h-6" />, title: 'Horarios Flexibles', desc: 'Adaptamos nuestros horarios a sus turnos de trabajo' },
    { icon: <Building className="w-6 h-6" />, title: 'En Sus Instalaciones', desc: 'Sala de primeros auxilios y enfermería en su centro' },
    { icon: <Shield className="w-6 h-6" />, title: 'Atención Preventiva', desc: 'Reducción de riesgos y accidentes laborales' },
    { icon: <FileText className="w-6 h-6" />, title: 'Gestión Documental', desc: 'Informes y registros sanitarios completos' },
    { icon: <CheckCircle className="w-6 h-6" />, title: 'Cumplimiento Legal', desc: 'Aseguramos normativa de prevención de riesgos' }
  ];

  return (
    <div data-testid="cobertura-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Cobertura Sanitaria en Empresas
          </h1>
          <p className="text-xl opacity-90">
            Personal sanitario trabajando en sus instalaciones para el cuidado de sus trabajadores
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">¿Qué es nuestro servicio de cobertura sanitaria?</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            GASI proporciona <strong>personal sanitario cualificado</strong> que trabaja directamente dentro de sus instalaciones empresariales. No somos un servicio de emergencias ni de ambulancias: somos su <strong>equipo sanitario interno</strong>.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            Nuestros profesionales se integran en su centro de trabajo, estableciendo una <strong>sala de primeros auxilios</strong> completamente equipada y ofreciendo atención sanitaria básica, preventiva y de apoyo a la seguridad laboral.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed">
            Este servicio es especialmente valorado por centros logísticos, almacenes industriales, plataformas de distribución y empresas con alta densidad de trabajadores.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-12 text-center">
            Características del Servicio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover-lift" data-testid={`feature-${index}`}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] mb-2">{feature.title}</h3>
                <p className="text-[#64748B] text-sm">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-8 text-center">¿Para qué empresas está diseñado?</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">📦 Centros Logísticos y Almacenes</h3>
              <p className="text-[#64748B]">
                Empresas como Amazon, GXO o DHL que requieren personal sanitario disponible para atender incidencias durante operaciones 24/7.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">🏭 Industria y Manufactura</h3>
              <p className="text-[#64748B]">
                Fábricas y plantas industriales con trabajadores expuestos a riesgos laborales que necesitan respuesta sanitaria inmediata.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">🏬 Retail y Grandes Superficies</h3>
              <p className="text-[#64748B]">
                Centros comerciales como Leroy Merlin o Decathlon con alta afluencia de empleados y necesidad de atención sanitaria preventiva.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            ¿Necesita cobertura sanitaria en su empresa?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Solicite información personalizada sin compromiso
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto">
              <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100" data-testid="cta-contact">
                Solicitar Presupuesto
              </Button>
            </Link>
            <a href="tel:622822101">
              <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8]" data-testid="cta-call">
                Llamar: 622 822 101
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoberturaSanitaria;