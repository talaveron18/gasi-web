import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const FormacionSanitaria = () => (
  <div data-testid="formacion-page">
    <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Formación sanitaria para organizaciones</h1>
        <p className="text-xl opacity-90 mb-8">
          Formación práctica para equipos de trabajo en primeros auxilios, reanimación cardiopulmonar, soporte vital básico y utilización de desfibriladores. Adaptamos la propuesta a las necesidades de cada organización.
        </p>
        <Link to="/contacto" className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-medium bg-white text-[#005EB8] hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" data-testid="hero-contact-cta">Solicitar información</Link>
      </div>
    </section>

    <section className="py-20 bg-white"><div className="max-w-6xl mx-auto px-6 lg:px-8 mb-12"><img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=85" alt="Actividad formativa en grupo" loading="lazy" className="w-full h-64 md:h-80 object-cover rounded-2xl" /></div>
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">Cómo planteamos una solicitud</h2>
          <p className="text-lg text-[#64748B] max-w-3xl mx-auto">
            La publicación de esta página no implica disponibilidad de un curso concreto, certificación, precio ni fecha. Cada solicitud se valida antes de confirmar una propuesta.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card><CardContent className="p-7"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85" alt="Espacio de trabajo para planificar formación" loading="lazy" className="w-full h-40 object-cover rounded-lg mb-5" /><h3 className="font-bold text-lg mb-2">Necesidad</h3><p className="text-[#64748B]">Recogemos el objetivo, destinatarios y contexto de la organización.</p></CardContent></Card>
          <Card><CardContent className="p-7"><img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85" alt="Entorno educativo" loading="lazy" className="w-full h-40 object-cover rounded-lg mb-5" /><h3 className="font-bold text-lg mb-2">Alcance</h3><p className="text-[#64748B]">Revisamos si GASI puede ofrecer la acción y qué contenido y formato resultan aplicables.</p></CardContent></Card>
          <Card><CardContent className="p-7"><img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85" alt="Profesional sanitaria" loading="lazy" className="w-full h-40 object-cover rounded-lg mb-5" /><h3 className="font-bold text-lg mb-2">Confirmación</h3><p className="text-[#64748B]">Solo tras esa revisión se confirman condiciones, disponibilidad y demás aspectos de la propuesta.</p></CardContent></Card>
        </div>
      </div>
    </section>

    <section className="py-20 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Consulte su necesidad formativa</h2>
        <p className="text-lg text-[#64748B] mb-8">Cuéntenos qué necesita. Revisaremos la solicitud y confirmaremos si podemos atenderla y bajo qué alcance.</p>
        <Link to="/contacto" className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-medium bg-[#005EB8] hover:bg-[#004a92] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005EB8]" data-testid="cta-contact">Solicitar información</Link>
      </div>
    </section>
  </div>
);

export default FormacionSanitaria;
