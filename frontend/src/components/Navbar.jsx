import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass-effect shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center" data-testid="logo-link">
            <img 
              src="https://customer-assets.emergentagent.com/job_f98f3724-6c7c-43ce-a711-d735c45e5317/artifacts/9tonzp4x_Dise%C3%B1o%20sin%20t%C3%ADtulo%20%281%29.png" 
              alt="GASI Logo" 
              className="h-16 w-auto"
            />
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
                  <Link to="/salud-laboral" className="w-full" data-testid="nav-occupational-health">
                    Salud Laboral
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
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" data-testid="user-menu">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                    <span>{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="w-full" data-testid="user-dashboard-link">
                      <User className="mr-2 h-4 w-4" />
                      Mi Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/formacion-sanitaria" data-testid="nav-login-button">
                <Button className="bg-[#005EB8] hover:bg-[#004a92] text-white">
                  Acceder a Formación
                </Button>
              </Link>
            )}
          </div>

          <button 
            className="lg:hidden text-[#0F172A]"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-button"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 border-t" data-testid="mobile-menu">
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
              {user && (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
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