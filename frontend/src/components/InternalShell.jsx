import React from'react';
import{Link,useNavigate}from'react-router-dom';
import{Clock3,FileHeart,LogOut,ShieldCheck,UserCog,UserRound}from'lucide-react';
import{useInternalPrototypeAuth}from'@/contexts/InternalPrototypeAuthContext';
import GasiBrand from'./GasiBrand';

export default function InternalShell({children}){
 const nav=useNavigate();
 const{session,signOut,isMaster,canManageWorkers}=useInternalPrototypeAuth();
 const logout=async()=>{await signOut();nav('/interno/acceso',{replace:true});};
 return <div className="min-h-screen bg-slate-950 text-slate-100">
  <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-40">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
    <Link to="/interno/clinica" aria-label="GASI zona profesional"><GasiBrand inverse compact/></Link>
    {session&&<nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Navegación profesional">
     <Link to="/interno/clinica" className="rounded-lg px-3 py-2 hover:bg-slate-800 inline-flex items-center gap-2"><FileHeart className="w-4 h-4"/>Clínica</Link>
     <Link to="/interno/perfil" className="rounded-lg px-3 py-2 hover:bg-slate-800 inline-flex items-center gap-2"><UserRound className="w-4 h-4"/>Perfil</Link>
     {(isMaster||canManageWorkers)&&<Link to="/interno/trabajadores" className="rounded-lg px-3 py-2 hover:bg-slate-800 inline-flex items-center gap-2"><UserCog className="w-4 h-4"/>Trabajadores</Link>}
     {(isMaster||canManageWorkers)&&<Link to="/interno/control-horario" className="rounded-lg px-3 py-2 hover:bg-slate-800 inline-flex items-center gap-2"><Clock3 className="w-4 h-4"/>Control horario</Link>}
    </nav>}
    <div className="flex items-center gap-3">{session&&<span className="hidden lg:inline text-xs text-slate-500"><ShieldCheck className="w-3 h-3 inline mr-1"/>{session.displayName}</span>}<button onClick={logout} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 inline-flex items-center gap-2"><LogOut className="w-4 h-4"/><span className="hidden sm:inline">Salir</span></button></div>
   </div>
   {session&&<nav className="md:hidden border-t border-slate-800 px-3 py-2 flex gap-2 overflow-x-auto text-xs" aria-label="Navegación profesional móvil">
    <Link to="/interno/clinica" className="whitespace-nowrap rounded-lg border border-slate-800 px-3 py-2">Clínica</Link>
    <Link to="/interno/perfil" className="whitespace-nowrap rounded-lg border border-slate-800 px-3 py-2">Perfil</Link>
    {(isMaster||canManageWorkers)&&<Link to="/interno/trabajadores" className="whitespace-nowrap rounded-lg border border-slate-800 px-3 py-2">Trabajadores</Link>}
    {(isMaster||canManageWorkers)&&<Link to="/interno/control-horario" className="whitespace-nowrap rounded-lg border border-slate-800 px-3 py-2">Control horario</Link>}
   </nav>}
  </header>
  {children}
 </div>;
}
