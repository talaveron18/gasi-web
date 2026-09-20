import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#0F172A] text-white" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_f98f3724-6c7c-43ce-a711-d735c45e5317/artifacts/9tonzp4x_Dise%C3%B1o%20sin%20t%C3%ADtulo%20%281%29.png" 
              alt="GASI Logo" 
              className="h-80 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-gray-400 text-sm">
              Grupo de Asistencia Sanitaria Integral. Proveedor sanitario profesional para empresas.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Servicios</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/cobertura-sanitaria" className="text-gray-400 hover:text-white transition-colors">
                  Cobertura Sanitaria en Empresas
                </Link>
              </li>
              <li>
                <Link to="/formacion-sanitaria" className="text-gray-400 hover:text-white transition-colors">
                  Formación Sanitaria
                </Link>
              </li>
              <li>
                <Link to="/salud-laboral" className="text-gray-400 hover:text-white transition-colors">
                  Salud Laboral y Reconocimientos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/quienes-somos" className="text-gray-400 hover:text-white transition-colors">
                  Quiénes Somos
                </Link>
              </li>
              <li>
                <Link to="/sectores" className="text-gray-400 hover:text-white transition-colors">
                  Sectores Empresariales
                </Link>
              </li>
              <li>
                <Link to="/contacto" className="text-gray-400 hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link to="/politica-privacidad" className="text-gray-400 hover:text-white transition-colors">
                  Política de Protección de Datos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Contacto</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4" />
                <a href="tel:622822101" className="hover:text-white transition-colors">
                  622 822 101
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4" />
                <a href="https://wa.me/34634029865" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  634 029 865 (WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="w-4 h-4" />
                <a href="mailto:coordinacion@gasisalud.com" className="hover:text-white transition-colors">
                  coordinacion@gasisalud.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} GASI - Grupo de Asistencia Sanitaria Integral. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;