import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, FileCheck, Heart, Users, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SaludLaboral = () => {
  const services = [
    { icon: <FileCheck className="w-8 h-8" />, title: 'Reconocimientos Médicos Obligatorios', desc: 'Cumplimiento normativo completo según legislación vigente' },
    { icon: <Activity className="w-8 h-8" />, title: 'Chequeos Preventivos', desc: 'Evaluaciones de salud personalizadas para cada puesto' },
    { icon: <Heart className="w-8 h-8" />, title: 'Campañas de Salud', desc: 'Programas de bienestar y prevención en su empresa' },
    { icon: <Users className="w-8 h-8" />, title: 'Vigilancia de la Salud', desc: 'Seguimiento continuo del estado de salud laboral' },
    { icon: <Calendar className="w-8 h-8" />, title: 'Planificación Anual', desc: 'Gestión de calendarios y convocatorias' },
    { icon: <TrendingUp className="w-8 h-8" />, title: 'Informes y Analíticas', desc: 'Datos estadísticos para toma de decisiones' }
  ];

  return (
    <div data-testid="salud-laboral-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">
            Salud Laboral y Reconocimientos Médicos
          </h1>
          <p className="text-xl opacity-90">
            Control de salud preventivo y reconocimientos médicos para su empresa
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Servicios de Salud Laboral</h2>
              <p className="text-lg text-[#64748B] leading-relaxed mb-6">
                La salud laboral es un pilar fundamental para cualquier empresa. GASI ofrece <strong>servicios integrales de reconocimientos médicos laborales</strong>, chequeos preventivos y campañas de salud corporativa adaptadas a las necesidades de su organización.
              </p>
              <p className="text-lg text-[#64748B] leading-relaxed">
                Nuestro enfoque preventivo ayuda a detectar problemas de salud antes de que afecten al rendimiento laboral, reduciendo el absentismo y mejorando el bienestar general de sus trabajadores.
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://customer-assets.emergentagent.com/job_gasi-laboral/artifacts/cokq50xq_download.png" 
                alt="Reconocimiento médico GASI" 
                className="rounded-2xl shadow-xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-12 text-center">
            ¿Qué Incluyen Nuestros Servicios?
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
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-8 text-center">Proceso de Reconocimientos Médicos</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#005EB8] text-white rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#0F172A] mb-2">Planificación</h3>
                <p className="text-[#64748B]">
                  Diseñamos un calendario de reconocimientos adaptado a su empresa y necesidades específicas de cada puesto.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#005EB8] text-white rounded-full flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#0F172A] mb-2">Convocatoria</h3>
                <p className="text-[#64748B]">
                  Gestionamos las citas con sus trabajadores, organizando grupos y horarios para minimizar el impacto en la producción.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#005EB8] text-white rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#0F172A] mb-2">Realización</h3>
                <p className="text-[#64748B]">
                  Realizamos los reconocimientos médicos completos: análisis clínicos, pruebas físicas, evaluaciones específicas por puesto.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#005EB8] text-white rounded-full flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#0F172A] mb-2">Informes y Seguimiento</h3>
                <p className="text-[#64748B]">
                  Entregamos informes detallados individuales y estadísticas agregadas. Realizamos seguimiento de casos que requieran atención.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Proteja la Salud de sus Trabajadores
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Solicite información sobre nuestros servicios de salud laboral
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contacto">
              <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100" data-testid="cta-contact">
                Solicitar Información
              </Button>
            </Link>
            <a href="https://wa.me/34634029865" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#005EB8]" data-testid="cta-whatsapp">
                WhatsApp: 634 029 865
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SaludLaboral;