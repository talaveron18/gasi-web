import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Heart, Users, Award, ShieldCheck, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QuienesSomos = () => {
  const values = [
    { icon: <Heart className="w-8 h-8" />, title: 'Atención Sanitaria', desc: 'Servicios sanitarios orientados a las necesidades reales de cada organización' },
    { icon: <Users className="w-8 h-8" />, title: 'Orientación al Cliente', desc: 'Configuraciones adaptadas a cada empresa dentro del alcance autorizado' },
    { icon: <Award className="w-8 h-8" />, title: 'Profesionalidad', desc: 'Profesionales sanitarios con los requisitos aplicables a cada servicio' },
    { icon: <ShieldCheck className="w-8 h-8" />, title: 'Seguridad Asistencial', desc: 'Protocolos, trazabilidad y límites de actuación definidos' },
    { icon: <Stethoscope className="w-8 h-8" />, title: 'Coordinación Clínica', desc: 'Enfermería presencial con apoyo médico remoto asociado cuando la configuración lo contemple' },
    { icon: <Target className="w-8 h-8" />, title: 'Claridad de Alcance', desc: 'Cada servicio se presta conforme a la habilitación y autorización que corresponda' }
  ];

  return (
    <div data-testid="quienes-somos-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Quiénes Somos</h1>
          <p className="text-xl opacity-90">
            GASI - Grupo de Asistencia Sanitaria Integral, servicios sanitarios para empresas y organizaciones
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Nuestra Empresa</h2>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              GASI organiza servicios sanitarios para empresas y organizaciones, con configuraciones que pueden incluir enfermería presencial, apoyo médico remoto asociado, fisioterapia, psicología y formación sanitaria.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              Cada servicio se define según las necesidades del cliente y queda condicionado a la habilitación profesional, autorización sanitaria y demás requisitos que resulten aplicables a la configuración concreta.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              GASI no actúa como servicio de prevención ajeno y no ofrece vigilancia de la salud, reconocimientos médicos laborales, evaluación de riesgos ni gestión de bajas como parte de esta oferta.
            </p>

            <h2 className="text-3xl font-bold text-[#0F172A] mb-6 mt-12">Nuestra Filosofía</h2>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              Nuestro enfoque parte de una asistencia sanitaria delimitada, trazable y coordinada, con funciones y circuitos definidos para cada profesional y servicio.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed">
              Priorizamos la seguridad asistencial, la claridad del alcance, la adaptación operativa y la mejora continua sin atribuir a los servicios resultados clínicos, laborales o económicos que no estén respaldados.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">Nuestros Valores</h2>
            <p className="text-lg text-[#64748B]">Los principios que guían nuestra forma de trabajar</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-8 hover-lift" data-testid={`value-card-${index}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">{value.icon}</div>
                <h3 className="font-bold text-[#0F172A] text-xl mb-3">{value.title}</h3>
                <p className="text-[#64748B]">{value.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-6 text-center">Nuestro Enfoque B2B</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-8 text-center">Configuramos la prestación sanitaria para integrarla de forma clara en la operativa del cliente.</p>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">Adaptación operativa</h3>
              <p className="text-[#64748B]">La configuración concreta puede adaptarse a horarios, centros y necesidades del cliente, siempre dentro del alcance profesional y sanitario aplicable.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">Servicios definidos</h3>
              <p className="text-[#64748B]">La propuesta identifica qué servicios se prestan, dónde se prestan y qué requisitos deben estar resueltos antes de su inicio.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">Trazabilidad</h3>
              <p className="text-[#64748B]">La actividad asistencial y operativa se apoya en protocolos y registros adecuados al servicio, sin prometer impactos no demostrados sobre productividad, bajas o absentismo.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">Hablemos de su necesidad sanitaria</h2>
          <p className="text-xl mb-8 opacity-90">Podemos estudiar una configuración adecuada a su empresa y al alcance sanitario aplicable.</p>
          <Link to="/contacto">
            <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100 text-lg px-8" data-testid="cta-contact">Contactar</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default QuienesSomos;
