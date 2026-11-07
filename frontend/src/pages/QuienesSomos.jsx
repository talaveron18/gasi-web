import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

const QuienesSomos = () => {
  const values = [
    { image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=85', imageAlt: 'Profesional sanitario prestando atención', title: 'Atención Sanitaria', desc: 'Atención sanitaria integral adaptada a las necesidades de cada organización' },
    { image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85', imageAlt: 'Espacio de trabajo empresarial', title: 'Orientación al Cliente', desc: 'Configuraciones adaptadas a cada empresa dentro del alcance autorizado' },
    { image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=85', imageAlt: 'Profesional sanitaria', title: 'Profesionalidad', desc: 'Profesionales sanitarios con los requisitos aplicables a cada servicio' },
    { image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85', imageAlt: 'Profesionales en un entorno sanitario', title: 'Seguridad Asistencial', desc: 'Protocolos, trazabilidad y límites de actuación definidos' },
    { image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1000&q=85', imageAlt: 'Equipo de atención sanitaria', title: 'Prestación Delimitada', desc: 'La propuesta concreta define la prestación que puede realizarse antes de su inicio' },
    { image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=85', imageAlt: 'Entorno de trabajo organizado', title: 'Claridad de Alcance', desc: 'Cada servicio se presta conforme a la habilitación y autorización que corresponda' }
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
          <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85" alt="Entorno de trabajo empresarial" loading="lazy" className="w-full h-64 sm:h-80 object-cover rounded-2xl mb-10" /><div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Nuestra Empresa</h2>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              GASI — Grupo de Asistencia Sanitaria Integral es una empresa orientada al desarrollo de soluciones sanitarias para empresas y organizaciones. Nuestro objetivo es acercar la atención sanitaria al entorno de trabajo mediante un modelo de asistencia integral, flexible y adaptado a las características de cada organización.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              Entendemos que cada empresa tiene necesidades diferentes. Por eso, trabajamos para diseñar servicios que integren atención sanitaria, coordinación profesional y una organización asistencial adecuada a cada centro.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              Además de nuestra actividad asistencial, desarrollamos una línea de formación sanitaria para empresas, centrada en primeros auxilios, reanimación cardiopulmonar, soporte vital básico y utilización de desfibriladores. Nuestra propuesta combina cercanía, profesionalidad y capacidad de adaptación.
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
              <Card key={index} className="overflow-hidden h-full hover-lift" data-testid={`value-card-${index}`}>
                <div className="h-48 overflow-hidden bg-[#EAF4FC]"><img src={value.image} alt={value.imageAlt} loading="lazy" decoding="async" className="w-full h-full object-cover" /></div>
                <div className="p-8 text-center">
                <h3 className="font-bold text-[#0F172A] text-xl mb-3">{value.title}</h3>
                <p className="text-[#64748B]">{value.desc}</p>
                </div>
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
          <Link to="/contacto" className="inline-flex items-center justify-center rounded-md px-8 py-3 text-lg font-medium bg-white text-[#005EB8] hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" data-testid="cta-contact">Contactar</Link>
        </div>
      </section>
    </div>
  );
};

export default QuienesSomos;
