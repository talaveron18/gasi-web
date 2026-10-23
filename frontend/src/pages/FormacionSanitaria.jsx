import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const FormacionSanitaria = () => (
  <div data-testid="formacion-page">
    <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Formación sanitaria para organizaciones</h1>
        <p className="text-xl opacity-90 mb-8">
          Estudiamos necesidades de formación sanitaria y confirmamos previamente si podemos atenderlas, con qué contenido, formato y alcance.
        </p>
        <Link to="/contacto">
          <Button size="lg" className="bg-white text-[#005EB8] hover:bg-gray-100" data-testid="hero-contact-cta">Solicitar información</Button>
        </Link>
      </div>
    </section>

    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">Cómo planteamos una solicitud</h2>
          <p className="text-lg text-[#64748B] max-w-3xl mx-auto">
            La publicación de esta página no implica disponibilidad de un curso concreto, certificación, precio ni fecha. Cada solicitud se valida antes de confirmar una propuesta.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card><CardContent className="p-7"><ClipboardCheck className="w-9 h-9 text-[#005EB8] mb-4" aria-hidden="true" /><h3 className="font-bold text-lg mb-2">Necesidad</h3><p className="text-[#64748B]">Recogemos el objetivo, destinatarios y contexto de la organización.</p></CardContent></Card>
          <Card><CardContent className="p-7"><BookOpen className="w-9 h-9 text-[#005EB8] mb-4" aria-hidden="true" /><h3 className="font-bold text-lg mb-2">Alcance</h3><p className="text-[#64748B]">Revisamos si GASI puede ofrecer la acción y qué contenido y formato resultan aplicables.</p></CardContent></Card>
          <Card><CardContent className="p-7"><CheckCircle className="w-9 h-9 text-[#005EB8] mb-4" aria-hidden="true" /><h3 className="font-bold text-lg mb-2">Confirmación</h3><p className="text-[#64748B]">Solo tras esa revisión se confirman condiciones, disponibilidad y demás aspectos de la propuesta.</p></CardContent></Card>
        </div>
      </div>
    </section>

    <section className="py-20 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Consulte su necesidad formativa</h2>
        <p className="text-lg text-[#64748B] mb-8">Cuéntenos qué necesita. Revisaremos la solicitud y confirmaremos si podemos atenderla y bajo qué alcance.</p>
        <Link to="/contacto"><Button size="lg" className="bg-[#005EB8] hover:bg-[#004a92] text-white" data-testid="cta-contact">Solicitar información</Button></Link>
      </div>
    </section>
  </div>
);

export default FormacionSanitaria;
