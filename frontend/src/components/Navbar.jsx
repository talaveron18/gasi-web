import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GasiBrand from './GasiBrand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();


  const isActive = (path) => location.pathname === path;


  return (
    <nav className="sticky top-0 z-50 glass-effect shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center" data-testid="logo-link">
            <GasiBrand compact />
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            <Link to="/" data-testid="nav-home">
              <Button 
                variant="ghost" 
                className={isActive('/') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}
              >
                Inicio
              </Button>
            </Link>
            
            <Link to="/quienes-somos" data-testid="nav-about">
              <Button 
                variant="ghost"
                className={isActive('/quienes-somos') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}
              >
                Quiénes Somos
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-[#0F172A]"
                  data-testid="nav-services-dropdown"
                >
                  Servicios <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuItem asChild>
                  <Link to="/servicios" className="w-full" data-testid="nav-services-overview">
                    Todos los Servicios
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cobertura-sanitaria" className="w-full" data-testid="nav-coverage">
                    Cobertura Sanitaria en Empresas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/formacion-sanitaria" className="w-full" data-testid="nav-training">
                    Formación Sanitaria
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/servicios-sanitarios-organizaciones" className="w-full" data-testid="nav-health-services">
                    Servicios Sanitarios para Organizaciones
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/sectores" data-testid="nav-sectors">
              <Button 
                variant="ghost"
                className={isActive('/sectores') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}
              >
                Sectores
              </Button>
            </Link>

            <Link to="/contacto" data-testid="nav-contact">
              <Button 
                variant="ghost"
                className={isActive('/contacto') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}
              >
                Contacto
              </Button>
            </Link>
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            <Link to="/interno/acceso" data-testid="nav-login-button">
                <Button className="bg-[#005EB8] hover:bg-[#004a92] text-white">
                  Zona profesional
                </Button>
              </Link>
          </div>

          <button 
            className="lg:hidden text-[#0F172A]"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-button"
            aria-label={isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isOpen && (
          <div id="mobile-navigation" className="lg:hidden py-4 border-t" data-testid="mobile-menu">
            <div className="flex flex-col space-y-2">
              <Link to="/" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Inicio</Button>
              </Link>
              <Link to="/quienes-somos" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Quiénes Somos</Button>
              </Link>
              <Link to="/servicios" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Servicios</Button>
              </Link>
              <Link to="/sectores" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Sectores</Button>
              </Link>
              <Link to="/contacto" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Contacto</Button>
              </Link>
              <Link to="/interno/acceso" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Zona profesional</Button>
              </Link>>
                    <Button variant="ghost" className="w-full justify-start">Mi Dashboard</Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                  >
                    Cerrar Sesión
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;