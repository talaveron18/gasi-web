import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
            <img src="https://customer-assets.emergentagent.com/job_f98f3724-6c7c-43ce-a711-d735c45e5317/artifacts/9tonzp4x_Dise%C3%B1o%20sin%20t%C3%ADtulo%20%281%29.png" alt="GASI Logo" className="h-80 w-auto" />
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            <Link to="/" data-testid="nav-home" className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] ${isActive('/') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}`}>Inicio</Link>
            <Link to="/quienes-somos" data-testid="nav-about" className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] ${isActive('/quienes-somos') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}`}>Quiénes Somos</Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="text-[#0F172A]" data-testid="nav-services-dropdown">Servicios <ChevronDown className="ml-1 h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuItem asChild><Link to="/servicios" className="w-full" data-testid="nav-services-overview">Todos los Servicios</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/cobertura-sanitaria" className="w-full" data-testid="nav-coverage">Enfermería presencial para organizaciones</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/formacion-sanitaria" className="w-full" data-testid="nav-training">Formación Sanitaria</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/sectores" data-testid="nav-sectors" className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] ${isActive('/sectores') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}`}>Sectores</Link>
            <Link to="/contacto" data-testid="nav-contact" className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] ${isActive('/contacto') ? 'text-[#005EB8] font-semibold' : 'text-[#0F172A]'}`}>Contacto</Link>
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            <Link to="/acceso" data-testid="nav-login-button" className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] bg-[#005EB8] hover:bg-[#004a92] text-white">Acceder</Link>
          </div>

          <button className="lg:hidden text-[#0F172A]" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'} aria-expanded={isOpen} aria-controls="mobile-navigation-menu" data-testid="mobile-menu-button">{isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>

        {isOpen && <div id="mobile-navigation-menu" className="lg:hidden py-4 border-t" data-testid="mobile-menu"><div className="flex flex-col space-y-2">
          <Link to="/" onClick={() => setIsOpen(false)} className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] w-full justify-start">Inicio</Link>
          <Link to="/quienes-somos" onClick={() => setIsOpen(false)} className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] w-full justify-start">Quiénes Somos</Link>
          <Link to="/servicios" onClick={() => setIsOpen(false)} className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] w-full justify-start">Servicios</Link>
          <Link to="/sectores" onClick={() => setIsOpen(false)} className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] w-full justify-start">Sectores</Link>
          <Link to="/contacto" onClick={() => setIsOpen(false)} className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] w-full justify-start">Contacto</Link>
          <Link to="/acceso" onClick={() => setIsOpen(false)} data-testid="mobile-access-link" className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8] w-full justify-start bg-[#005EB8] text-white">Acceder</Link>
        </div></div>}
      </div>
    </nav>
  );
};

export default Navbar;
