import React,{useState}from'react';
import{Link,useLocation}from'react-router-dom';
import{ChevronDown,Menu,X}from'lucide-react';
import{Button}from'@/components/ui/button';
import GasiBrand from'./GasiBrand';
import{DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger}from'@/components/ui/dropdown-menu';

export default function Navbar(){
 const[isOpen,setIsOpen]=useState(false);
 const location=useLocation();
 const active=path=>location.pathname===path;
 return <nav className="sticky top-0 z-50 glass-effect shadow-sm" aria-label="Navegación principal"><div className="max-w-7xl mx-auto px-6 lg:px-8">
  <div className="flex justify-between items-center h-20">
   <Link to="/" className="flex items-center" data-testid="logo-link" aria-label="GASI - Inicio"><GasiBrand compact/></Link>
   <div className="hidden lg:flex items-center space-x-1">
    <Link to="/"><Button variant="ghost" className={active('/')?'text-[#005EB8] font-semibold':'text-[#0F172A]'}>Inicio</Button></Link>
    <Link to="/quienes-somos"><Button variant="ghost" className={active('/quienes-somos')?'text-[#005EB8] font-semibold':'text-[#0F172A]'}>Quiénes somos</Button></Link>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="text-[#0F172A]">Servicios <ChevronDown className="ml-1 h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent className="w-72">
     <DropdownMenuItem asChild><Link to="/servicios" className="w-full">Todos los servicios</Link></DropdownMenuItem>
     <DropdownMenuItem asChild><Link to="/cobertura-sanitaria" className="w-full">Cobertura sanitaria en empresas</Link></DropdownMenuItem>
     <DropdownMenuItem asChild><Link to="/servicios-sanitarios-organizaciones" className="w-full">Servicios sanitarios complementarios</Link></DropdownMenuItem>
     <DropdownMenuItem asChild><Link to="/formacion-sanitaria" className="w-full">Formación sanitaria</Link></DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>
    <Link to="/formacion-sanitaria"><Button variant="ghost" className={active('/formacion-sanitaria')?'text-[#005EB8] font-semibold':'text-[#0F172A]'}>Formación</Button></Link>
    <Link to="/sectores"><Button variant="ghost" className={active('/sectores')?'text-[#005EB8] font-semibold':'text-[#0F172A]'}>Sectores</Button></Link>
    <Link to="/contacto"><Button variant="ghost" className={active('/contacto')?'text-[#005EB8] font-semibold':'text-[#0F172A]'}>Contacto</Button></Link>
   </div>
   <div className="hidden lg:flex items-center"><Link to="/interno/acceso"><Button className="bg-[#005EB8] hover:bg-[#004a92] text-white">Zona profesional</Button></Link></div>
   <button className="lg:hidden text-[#0F172A] p-2" onClick={()=>setIsOpen(v=>!v)} aria-label={isOpen?'Cerrar menú de navegación':'Abrir menú de navegación'} aria-expanded={isOpen} aria-controls="mobile-navigation">{isOpen?<X className="h-6 w-6"/>:<Menu className="h-6 w-6"/>}</button>
  </div>
  {isOpen&&<div id="mobile-navigation" className="lg:hidden py-4 border-t"><div className="flex flex-col space-y-1">
   {[['/','Inicio'],['/quienes-somos','Quiénes somos'],['/servicios','Servicios'],['/cobertura-sanitaria','Cobertura sanitaria'],['/servicios-sanitarios-organizaciones','Servicios complementarios'],['/formacion-sanitaria','Formación sanitaria'],['/sectores','Sectores'],['/contacto','Contacto'],['/interno/acceso','Zona profesional']].map(([to,label])=><Link key={to} to={to} onClick={()=>setIsOpen(false)}><Button variant="ghost" className="w-full justify-start">{label}</Button></Link>)}
  </div></div>}
 </div></nav>;
}
