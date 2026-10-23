import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Clock, Building, CheckCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CoberturaSanitaria = () => {
  const features = [
    { icon: <Users className="w-6 h-6" />, title: 'Enfermería Presencial', desc: 'Personal de enfermería para coberturas previamente delimitadas' },
    { icon: <Clock className="w-6 h-6" />, title: 'Cobertura Planificada', desc: 'Horarios y presencia definidos previamente según las necesidades y el alcance aplicable' },
    { icon: <Building className="w-6 h-6" />, title: 'En Sus Instalaciones', desc: 'Prestación presencial en el centro acordado cuando el servicio resulte aplicable' },
    { icon: <Shield className="w-6 h-6" />, title: 'Alcance Definido', desc: 'Las actuaciones incluidas se concretan antes del inicio del servicio' },
    { icon: <FileText className="w-6 h-6" />, title: 'Registro Asistencial', desc: 'Documentación de la actividad conforme al servicio contratado y a los requisitos aplicables' },
    { icon: <CheckCircle className="w-6 h-6" />, title: 'Validación Previa', desc: 'Confirmamos previamente que la cobertura solicitada puede prestarse dentro del alcance aplicable' }
  ];

  return (
    <div data-testid="cobertura-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Cobertura Sanitaria en Empresas
          </h1>
          <p className="text-xl opacity-90">
            Enfermería presencial en sus instalaciones, con alcance y condiciones definidos previamente
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">¿Qué es nuestro servicio de cobertura sanitaria?</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            GASI organiza <strong>coberturas presenciales de enfermería</strong> en instalaciones de organizaciones cuando la necesidad planteada encaja en el alcance aplicable. No somos un servicio de emergencias ni de ambulancias.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">
            Antes de iniciar una cobertura definimos con la organización el centro, horario, funciones y medios necesarios. La prestación queda limitada a lo acordado y a las actuaciones que correspondan al perfil profesional y al marco aplicable.
          </p>
          <p className="text-lg text-[#64748B] leading-relaxed">
            Si necesita presencia sanitaria en su organización, puede trasladarnos el caso para que valoremos si podemos atenderlo y en qué condiciones.
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
          <h2 className="text-3xl font-bold text-[#0F172A] mb-8 text-center">¿En qué entornos puede plantearse?</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">📦 Logística y Almacenes</h3>
              <p className="text-[#64748B]">Centros que quieran valorar una cobertura presencial de enfermería para un horario y unas funciones previamente definidos.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">🏭 Industria</h3>
              <p className="text-[#64748B]">Instalaciones industriales que necesiten estudiar la incorporación de presencia de enfermería dentro de un alcance acordado.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">🏬 Centros de Trabajo</h3>
              <p className="text-[#64748B]">Otras organizaciones con centros presenciales pueden consultarnos su necesidad para valorar su encaje antes de ofrecer una cobertura.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">¿Necesita valorar una cobertura sanitaria?</h2>
          <p className="text-xl mb-8 opacity-90">Cuéntenos la necesidad. Confirmaremos primero si podemos atenderla y bajo qué alcance.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto">
              <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100" data-testid="cta-contact">Solicitar información</Button>
            </Link>
            <a href="tel:622822101">
              <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8]" data-testid="cta-call">Llamar: 622 822 101</Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoberturaSanitaria;