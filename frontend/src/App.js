import React from 'react';
import '@/App.css';
import '@/index.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import QuienesSomos from '@/pages/QuienesSomos';
import Servicios from '@/pages/Servicios';
import CoberturaSanitaria from '@/pages/CoberturaSanitaria';
import FormacionSanitaria from '@/pages/FormacionSanitaria';
import CursoDetalle from '@/pages/CursoDetalle';
import SaludLaboral from '@/pages/SaludLaboral';
import Sectores from '@/pages/Sectores';
import Contacto from '@/pages/Contacto';
import PoliticaPrivacidad from '@/pages/PoliticaPrivacidad';
import Dashboard from '@/pages/Dashboard';
import AuthCallback from '@/pages/AuthCallback';
import InternalClinicalPrototype from '@/pages/InternalClinicalPrototype';
import NotFound from '@/pages/NotFound';

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quienes-somos" element={<QuienesSomos />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/cobertura-sanitaria" element={<CoberturaSanitaria />} />
        <Route path="/formacion-sanitaria" element={<FormacionSanitaria />} />
        <Route path="/curso/:courseId" element={<CursoDetalle />} />
        <Route path="/servicios-sanitarios-organizaciones" element={<SaludLaboral />} />
        <Route path="/salud-laboral" element={<Navigate to="/servicios-sanitarios-organizaciones" replace />} />
        <Route path="/sectores" element={<Sectores />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interno/prototipo-clinico" element={<InternalClinicalPrototype />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;