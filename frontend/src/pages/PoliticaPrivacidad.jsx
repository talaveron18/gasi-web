import React from 'react';

const PoliticaPrivacidad = () => {
  return (
    <div className="min-h-screen bg-white" data-testid="privacy-policy-page">
      <section className="bg-[#0F172A] text-white py-12">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold" data-testid="page-title">
            Política de Protección de Datos
          </h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 prose prose-lg">
        <p className="text-[#64748B] mb-6">
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">1. Responsable del Tratamiento</h2>
        <p className="text-[#64748B] mb-6">
          GASI - Grupo de Asistencia Sanitaria Integral es responsable del tratamiento de los datos personales que nos facilite a través de nuestra web y servicios.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">2. Finalidad del Tratamiento</h2>
        <p className="text-[#64748B] mb-4">
          Los datos personales que recogemos serán tratados con las siguientes finalidades:
        </p>
        <ul className="list-disc pl-6 text-[#64748B] mb-6 space-y-2">
          <li>Gestionar las consultas y solicitudes de información recibidas a través del formulario de contacto</li>
          <li>Proporcionar los servicios sanitarios solicitados</li>
          <li>Gestionar la inscripción y acceso a la plataforma de formación</li>
          <li>Enviar comunicaciones relacionadas con nuestros servicios</li>
          <li>Cumplir con las obligaciones legales aplicables</li>
        </ul>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">3. Base Legal</h2>
        <p className="text-[#64748B] mb-6">
          El tratamiento de sus datos se basa en:
        </p>
        <ul className="list-disc pl-6 text-[#64748B] mb-6 space-y-2">
          <li>El consentimiento del interesado al facilitar sus datos</li>
          <li>La ejecución de un contrato de prestación de servicios</li>
          <li>El cumplimiento de obligaciones legales</li>
          <li>El interés legítimo en la mejora de nuestros servicios</li>
        </ul>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">4. Conservación de Datos</h2>
        <p className="text-[#64748B] mb-6">
          Los datos personales serán conservados durante el tiempo necesario para cumplir con la finalidad para la que se recabaron y para determinar las posibles responsabilidades que se pudieran derivar de dicha finalidad y del tratamiento de los datos, además de los periodos establecidos en la normativa de archivos y documentación aplicable.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">5. Destinatarios de los Datos</h2>
        <p className="text-[#64748B] mb-6">
          Sus datos no serán cedidos a terceros, salvo obligación legal. Podrán ser comunicados a prestadores de servicios con los que GASI tenga contratada la prestación de servicios necesarios para el desarrollo de su actividad, debidamente formalizados mediante los correspondientes contratos de encargo de tratamiento.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">6. Derechos del Usuario</h2>
        <p className="text-[#64748B] mb-4">
          Puede ejercer los siguientes derechos:
        </p>
        <ul className="list-disc pl-6 text-[#64748B] mb-6 space-y-2">
          <li><strong>Acceso:</strong> Derecho a obtener confirmación sobre si estamos tratando sus datos personales</li>
          <li><strong>Rectificación:</strong> Derecho a que se corrijan datos inexactos o incompletos</li>
          <li><strong>Supresión:</strong> Derecho a solicitar la eliminación de sus datos</li>
          <li><strong>Oposición:</strong> Derecho a oponerse al tratamiento de sus datos</li>
          <li><strong>Limitación:</strong> Derecho a solicitar la limitación del tratamiento</li>
          <li><strong>Portabilidad:</strong> Derecho a recibir sus datos en formato estructurado</li>
        </ul>
        <p className="text-[#64748B] mb-6">
          Para ejercer estos derechos, puede dirigirse a: <a href="mailto:coordinacion@gasisalud.com" className="text-[#005EB8] hover:underline">coordinacion@gasisalud.com</a>
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">7. Medidas de Seguridad</h2>
        <p className="text-[#64748B] mb-6">
          GASI ha adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad e integridad de los datos de carácter personal que trate, así como para evitar su pérdida, alteración y/o acceso por parte de terceros no autorizados.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">8. Cookies</h2>
        <p className="text-[#64748B] mb-6">
          Este sitio web utiliza cookies técnicas necesarias para el correcto funcionamiento de la plataforma y cookies de sesión para gestionar la autenticación de usuarios.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">9. Contacto</h2>
        <p className="text-[#64748B] mb-2">
          Para cualquier cuestión sobre esta política de privacidad, puede contactarnos en:
        </p>
        <ul className="list-none text-[#64748B] mb-6 space-y-2">
          <li><strong>Email:</strong> coordinacion@gasisalud.com</li>
          <li><strong>Teléfono:</strong> 622 822 101</li>
        </ul>

        <p className="text-[#64748B] text-sm mt-12 pt-6 border-t">
          GASI se reserva el derecho a modificar la presente política de protección de datos con el fin de adaptarla a novedades legislativas o jurisprudenciales, así como a prácticas de la industria.
        </p>
      </div>
    </div>
  );
};

export default PoliticaPrivacidad;