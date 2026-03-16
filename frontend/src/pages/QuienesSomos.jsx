import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Heart, Users, Award, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QuienesSomos = () => {
  const values = [
    { icon: <Heart className="w-8 h-8" />, title: 'Compromiso con la Salud', desc: 'Priorizamos el bienestar de los trabajadores' },
    { icon: <Users className="w-8 h-8" />, title: 'Orientación al Cliente', desc: 'Soluciones personalizadas para cada empresa' },
    { icon: <Award className="w-8 h-8" />, title: 'Excelencia Profesional', desc: 'Personal altamente cualificado' },
    { icon: <Shield className="w-8 h-8" />, title: 'Prevención y Seguridad', desc: 'Enfoque proactivo en salud laboral' },
    { icon: <TrendingUp className="w-8 h-8" />, title: 'Mejora Continua', desc: 'Innovación en servicios sanitarios' },
    { icon: <Target className="w-8 h-8" />, title: 'Eficiencia', desc: 'Optimizamos recursos y resultados' }
  ];

  return (
    <div data-testid="quienes-somos-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Quiénes Somos
          </h1>
          <p className="text-xl opacity-90">
            GASI - Grupo de Asistencia Sanitaria Integral, su socio de confianza en servicios sanitarios empresariales
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-6">
              Nuestra Empresa
            </h2>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              GASI es un proveedor sanitario profesional especializado en ofrecer servicios integrales de salud para empresas. No somos una empresa de ambulancias ni de emergencias; somos su socio estratégico en salud laboral preventiva y operativa.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              Trabajamos con empresas de todos los tamaños, especialmente en sectores logísticos, industriales y de retail, proporcionando cobertura sanitaria interna, formación especializada y servicios de salud laboral adaptados a cada organización.
            </p>

            <h2 className="text-3xl font-bold text-[#0F172A] mb-6 mt-12">
              Nuestra Filosofía
            </h2>
            <p className="text-lg text-[#64748B] leading-relaxed mb-6">
              Creemos que la salud de los trabajadores es fundamental para el éxito empresarial. Por eso, ofrecemos soluciones sanitarias que van más allá del cumplimiento normativo: creamos entornos laborales más seguros, saludables y productivos.
            </p>
            <p className="text-lg text-[#64748B] leading-relaxed">
              Nuestra filosofía se basa en la prevención, la profesionalidad, la flexibilidad y el compromiso con la excelencia en cada servicio que prestamos.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Nuestros Valores
            </h2>
            <p className="text-lg text-[#64748B]">
              Los principios que guían nuestra forma de trabajar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-8 hover-lift" data-testid={`value-card-${index}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#005EB8]/10 rounded-full text-[#005EB8] mb-4">
                  {value.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] text-xl mb-3">{value.title}</h3>
                <p className="text-[#64748B]">{value.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-6 text-center">
            Nuestro Enfoque B2B
          </h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-8 text-center">
            Entendemos las necesidades únicas de las empresas modernas
          </p>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">🏭 Adaptación Total</h3>
              <p className="text-[#64748B]">
                Nuestros servicios se adaptan a los horarios, espacios y necesidades específicas de su empresa, garantizando una integración perfecta con sus operaciones.
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">👥 Escalabilidad</h3>
              <p className="text-[#64748B]">
                Desde pequeñas empresas hasta grandes corporaciones, nuestras soluciones crecen con usted, manteniendo siempre los más altos estándares de calidad.
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-bold text-xl text-[#0F172A] mb-3">📊 Resultados Medibles</h3>
              <p className="text-[#64748B]">
                Proporcionamos informes y métricas que le permiten evaluar el impacto de nuestros servicios en la salud y productividad de su equipo.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Trabajemos Juntos
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Descubra cómo GASI puede transformar la salud laboral en su empresa
          </p>
          <Link to="/contacto">
            <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100 text-lg px-8" data-testid="cta-contact">
              Contáctenos
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default QuienesSomos;