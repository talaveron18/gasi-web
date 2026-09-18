import React from'react';
import{Link,useNavigate}from'react-router-dom';
import{Clock3,LogOut,ShieldCheck,Stethoscope,UserCog,UserRound}from'lucide-react';
import GasiBrand from'@/components/GasiBrand';
import{useInternalAuth}from'@/contexts/InternalAuthContext';

export default function InternalTopbar(){
 const nav=useNavigate(),{session,signOut,isMaster,canManageWorkers}=useInternalAuth();
 if(!session)return null;
 const logout=async()=>{await signOut();nav('/interno/acceso',{replace:true});};
 return <div className="border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
   <Link to="/interno/clinica" className="shrink-0"><GasiBrand inverse compact/></Link>
   <nav aria-label="Navegación profesional" className="hidden md:flex items-center gap-1 text-sm">
    <Link to="/interno/clinica" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"><Stethoscope className="w-4 h-4"/>Clínica</Link>
    <Link to="/interno/perfil" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"><UserRound className="w-4 h-4"/>Perfil</Link>
    {(isMaster||canManageWorkers)&&<Link to="/interno/trabajadores" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"><UserCog className="w-4 h-4"/>Trabajadores</Link>}
    {(isMaster||canManageWorkers)&&<Link to="/interno/control-horario" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white flex items-center gap-2"><Clock3 className="w-4 h-4"/>Control horario</Link>}
   </nav>
   <div className="flex items-center gap-3 min-w-0">
    <div className="hidden sm:block text-right min-w-0"><p className="text-sm font-semibold text-slate-100 truncate">{session.displayName}</p><p className="text-xs text-slate-500 truncate">{session.roleLabel}</p></div>
    <button onClick={logout} className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:text-white hover:border-slate-500" aria-label="Cerrar sesión"><LogOut className="w-4 h-4"/></button>
   </div>
  </div>
  <div className="md:hidden border-t border-slate-800 px-3 py-2 flex gap-2 overflow-x-auto text-xs">
   <Link to="/interno/clinica" className="whitespace-nowrap rounded px-3 py-2 bg-slate-900 text-slate-200">Clínica</Link>
   <Link to="/interno/perfil" className="whitespace-nowrap rounded px-3 py-2 bg-slate-900 text-slate-200">Perfil</Link>
   {(isMaster||canManageWorkers)&&<Link to="/interno/trabajadores" className="whitespace-nowrap rounded px-3 py-2 bg-slate-900 text-slate-200">Trabajadores</Link>}
   {(isMaster||canManageWorkers)&&<Link to="/interno/control-horario" className="whitespace-nowrap rounded px-3 py-2 bg-slate-900 text-slate-200">Control horario</Link>}
  </div>
 </div>;
}
