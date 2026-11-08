import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAula } from './AulaAuthContext';
import AulaLogin from './AulaLogin';
import AulaRecovery from './AulaRecovery';
import AulaCourses from './AulaCourses';
import AulaReader from './AulaReader';
import AulaAuthor from './AulaAuthor';
import AulaCertificates from './AulaCertificates';
import PoliticaPrivacidad from '@/pages/PoliticaPrivacidad';

// The dedicated private site never renders the public commercial or clinical
// routes. Role and enrolment permissions are checked again on every API call.
export default function AulaPrivateApp(){
  const {user} = useAula();
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <a href="#aula-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:p-3 focus:shadow-lg">Ir al contenido del aula</a>
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link to={user?'/aula/mis-cursos':'/aula/acceso'} className="inline-flex items-center gap-3 font-bold text-[#005EB8]" aria-label="Aula Virtual GASI, inicio">
          <GraduationCap size={30} aria-hidden="true"/> Aula Virtual GASI
        </Link>
        <nav aria-label="Navegación del aula" className="flex flex-wrap items-center gap-3 text-sm">
          {user && <Link to="/aula/mis-cursos" className="inline-flex items-center gap-1 font-semibold text-slate-700"><BookOpen size={16} aria-hidden="true"/> Mis cursos</Link>}
          {user && ['admin','author','tutor'].includes(user.role) && <Link to="/aula/autor" className="font-semibold text-slate-700">Gestión docente</Link>}
          <Link to="/politica-privacidad" className="text-slate-600 underline">Privacidad</Link>
        </nav>
      </div>
    </header>
    <div id="aula-main">
      <Routes>
        <Route path="/" element={<Navigate to="/aula/acceso" replace/>}/>
        <Route path="/aula/acceso" element={<AulaLogin/>}/>
        <Route path="/aula/recuperar" element={<AulaRecovery/>}/>
        <Route path="/aula/mis-cursos" element={<AulaCourses/>}/>
        <Route path="/aula/curso/:courseId" element={<AulaReader/>}/>
        <Route path="/aula/autor" element={<AulaAuthor/>}/>
        <Route path="/aula/certificados" element={<AulaCertificates/>}/>
        <Route path="/aula/certificado/:certificateId" element={<AulaCertificates/>}/>
        <Route path="/politica-privacidad" element={<PoliticaPrivacidad/>}/>
        <Route path="*" element={<Navigate to="/aula/acceso" replace/>}/>
      </Routes>
    </div>
    <footer className="mt-12 border-t border-slate-200 bg-white px-5 py-6 text-center text-xs text-slate-600">
      <p className="inline-flex items-center justify-center gap-2"><ShieldCheck size={15} aria-hidden="true"/> Acceso privado para cuentas autorizadas por GASI.</p>
      <p className="mt-1">Los certificados de finalización no constituyen por sí mismos títulos oficiales ni acreditaciones sanitarias.</p>
    </footer>
  </div>;
}
