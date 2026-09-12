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
          Última actualización: 12 de septiembre de 2026
        </p>

        <div className="mb-8 rounded-lg border border-[#D7EAF8] bg-[#F4F9FD] p-5 text-[#334155]">
          Esta política describe el tratamiento de datos en la web pública de GASI. Los formularios y el chatbot de esta web no son canales asistenciales y no deben utilizarse para enviar historias clínicas, diagnósticos, tratamientos ni otros datos de salud. El futuro entorno clínico, cuando esté autorizado y activo, tendrá sus propios controles e información aplicables.
        </div>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">1. Responsable del Tratamiento</h2>
        <p className="text-[#64748B] mb-6">
          GASI - Grupo de Asistencia Sanitaria Integral es responsable del tratamiento de los datos personales que se faciliten a través de esta web pública cuando actúe como responsable del flujo correspondiente.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">2. Finalidades en la web pública</h2>
        <p className="text-[#64748B] mb-4">
          Los datos facilitados a través de la web se utilizan, según el canal y la solicitud, para:
        </p>
        <ul className="list-disc pl-6 text-[#64748B] mb-6 space-y-2">
          <li>Gestionar consultas y solicitudes de información comercial o corporativa</li>
          <li>Responder a solicitudes de contacto relacionadas con los servicios ofrecidos</li>
          <li>Gestionar, cuando esté disponible, la inscripción y acceso a la plataforma de formación</li>
          <li>Atender comunicaciones y obligaciones aplicables al funcionamiento de la web</li>
        </ul>
        <p className="text-[#64748B] mb-6">
          La web pública no está diseñada para documentar asistencia sanitaria ni para recibir información clínica de pacientes.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">3. Base jurídica</h2>
        <p className="text-[#64748B] mb-6">
          La base jurídica se determina según el flujo concreto y puede incluir la solicitud o consentimiento de la persona interesada, medidas precontractuales o contractuales y el cumplimiento de obligaciones legales. No se utiliza una aceptación genérica de esta web para legitimar por sí sola tratamientos clínicos o finalidades distintas de las informadas.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">4. Conservación de Datos</h2>
        <p className="text-[#64748B] mb-6">
          Los datos personales serán conservados durante el tiempo necesario para cumplir con la finalidad para la que se recabaron y para determinar las posibles responsabilidades que se pudieran derivar de dicha finalidad y del tratamiento, además de los periodos establecidos en la normativa aplicable.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">5. Destinatarios y proveedores</h2>
        <p className="text-[#64748B] mb-6">
          Los datos podrán comunicarse cuando exista una obligación legal o cuando resulte necesario utilizar prestadores de servicios para el funcionamiento de la web y sus canales de contacto. Cuando un proveedor actúe como encargado, la relación deberá estar regulada conforme al marco aplicable. Esta web no autoriza por sí sola el uso de proveedores para datos clínicos reales.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">6. Derechos</h2>
        <p className="text-[#64748B] mb-4">
          Según corresponda al tratamiento concreto, puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad previstos en la normativa de protección de datos.
        </p>
        <p className="text-[#64748B] mb-6">
          Para ejercerlos o realizar una consulta sobre privacidad, puede dirigirse a: <a href="mailto:coordinacion@gasisalud.com" className="text-[#005EB8] hover:underline">coordinacion@gasisalud.com</a>
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">7. Seguridad</h2>
        <p className="text-[#64748B] mb-6">
          GASI aplica medidas técnicas y organizativas orientadas a proteger los datos frente a acceso, alteración, pérdida o divulgación no autorizados. Los secretos de los servicios de la web no deben incorporarse al código público ni a los formularios.
        </p>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-4">8. Cookies y analítica</h2>
        <p className="text-[#64748B] mb-6">
          La versión actual de la web no carga analítica de comportamiento ni grabación de sesiones. Podrán utilizarse mecanismos técnicos estrictamente necesarios para funciones solicitadas por el usuario, como autenticación cuando proceda. Si se incorpora analítica u otra tecnología no necesaria, deberá revisarse esta información y el mecanismo de consentimiento aplicable antes de activarla.
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
          Esta política deberá revisarse cuando cambien los formularios, proveedores, tecnologías de seguimiento o finalidades de la web pública.
        </p>
      </div>
    </div>
  );
};

export default PoliticaPrivacidad;
