import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Clock, Building, CheckCircle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CoberturaSanitaria = () => {
  const features = [
    { icon: <Users className="w-6 h-6" />, title: 'Personal sanitario', desc: 'Profesionales asignados según el alcance acordado y autorizado para cada servicio' },
    { icon: <Clock className="w-6 h-6" />, title: 'Cobertura configurable', desc: 'Horarios y presencia definidos según las necesidades acordadas con cada organización' },
    { icon: <Building className="w-6 h-6" />, title: 'En el centro de trabajo', desc: 'Prestación presencial cuando forme parte de la configuración contratada' },
    { icon: <Shield className="w-6 h-6" />, title: 'Apoyo sanitario', desc: 'Atención y apoyo dentro de las competencias profesionales y del alcance definido' },
    { icon: <FileText className="w-6 h-6" />, title: 'Registro del servicio', desc: 'Documentación y trazabilidad cuando resulten aplicables a la prestación' },
    { icon: <CheckCircle className="w-6 h-6" />, title: 'Alcance previo', desc: 'Las prestaciones se concretan antes de activar el servicio' }
  ];

  return (
    <div data-testid="cobertura-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Cobertura Sanitaria en Empresas</h1>
          <p className="text-xl opacity-90">Cobertura sanitaria configurada para las necesidades acordadas con cada organización</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-6">¿Qué es nuestro servicio de cobertura sanitaria?</h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">GASI plantea servicios de <strong>cobertura sanitaria para organizaciones</strong> con profesionales y recursos definidos para cada centro. No es un servicio de emergencias ni de ambulancias.</p>
          <p className="text-lg text-[#64748B] leading-relaxed mb-6">Antes del inicio se concreta la configuración del servicio, la presencia necesaria y las prestaciones incluidas, siempre dentro de las competencias profesionales y de los requisitos administrativos que resulten aplicables.</p>
          <p className="text-lg text-[#64748B] leading-relaxed">La solución puede estudiarse para centros logísticos, industria, distribución, retail y otros centros de trabajo que necesiten cobertura sanitaria presencial.</p>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-12 text-center">Características del servicio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover-lift" data-testid={`feature-${index}`}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">{feature.icon}</div>
                <h3 className="font-bold text-[#0F172A] mb-2">{feature.title}</h3>
                <p className="text-[#64748B] text-sm">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-8 text-center">Entornos en los que puede plantearse</h2>
          <div className="space-y-6">
            <Card className="p-6"><h3 className="font-bold text-xl text-[#0F172A] mb-3">📦 Centros logísticos y almacenes</h3><p className="text-[#64748B]">Centros con operativa continuada o alta concentración de trabajadores donde se valore disponer de cobertura sanitaria presencial.</p></Card>
            <Card className="p-6"><h3 className="font-bold text-xl text-[#0F172A] mb-3">🏭 Industria y manufactura</h3><p className="text-[#64748B]">Instalaciones industriales donde la organización necesite estudiar una configuración sanitaria adaptada a su actividad.</p></Card>
            <Card className="p-6"><h3 className="font-bold text-xl text-[#0F172A] mb-3">🏬 Retail y grandes superficies</h3><p className="text-[#64748B]">Centros con equipos numerosos o alta afluencia en los que pueda resultar útil una cobertura sanitaria definida para el centro.</p></Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">¿Necesita estudiar una cobertura sanitaria para su empresa?</h2>
          <p className="text-xl mb-8 opacity-90">Cuéntenos el contexto y revisaremos qué configuración puede plantearse.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto"><Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100" data-testid="cta-contact">Solicitar información</Button></Link>
            <a href="tel:622822101"><Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8]" data-testid="cta-call">Llamar: 622 822 101</Button></a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoberturaSanitaria;
