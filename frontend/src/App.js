import React, { useEffect, useState } from 'react';
import '@/App.css';
import '@/index.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { InternalPrototypeAuthProvider, useInternalPrototypeAuth } from '@/contexts/InternalPrototypeAuthContext';
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
import InternalAccess from '@/pages/InternalAccess';
import InternalClinicalPrototype from '@/pages/InternalClinicalPrototype';
import InternalWorkers from '@/pages/InternalWorkers';
import InternalProfile from '@/pages/InternalProfile';
import NotFound from '@/pages/NotFound';

function InternalAuthenticated({ children }) {
  const { isAuthenticated, session, centralValidationEnabled, validateSession } = useInternalPrototypeAuth();
  const [validatedId, setValidatedId] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!centralValidationEnabled || !isAuthenticated || !session?.id) {
      setValidatedId(session?.id || null);
      return () => { mounted = false; };
    }
    setValidatedId(null);
    validateSession(session).finally(() => {
      if (mounted) setValidatedId(session.id);
    });
    return () => { mounted = false; };
  }, [centralValidationEnabled, isAuthenticated, session?.id, validateSession]);

  if (!isAuthenticated) return <Navigate to="/interno/acceso" replace />;
  if (centralValidationEnabled && validatedId !== session?.id) {
    return <main className="min-h-[50vh] flex items-center justify-center bg-slate-950 text-slate-200"><p role="status">Validando sesión sintética…</p></main>;
  }
  return children;
}

function InternalClinicalGuard() {
  return <InternalAuthenticated><InternalClinicalPrototype /></InternalAuthenticated>;
}

function InternalProfileGuard() {
  return <InternalAuthenticated><InternalProfile /></InternalAuthenticated>;
}

function InternalAdminContent() {
  const { session } = useInternalPrototypeAuth();
  return session?.role === 'admin' ? <InternalWorkers /> : <Navigate to="/interno/prototipo-clinico" replace />;
}

function InternalAdminGuard() {
  return <InternalAuthenticated><InternalAdminContent /></InternalAuthenticated>;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) return <AuthCallback />;
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
        <Route path="/interno" element={<Navigate to="/interno/acceso" replace />} />
        <Route path="/interno/acceso" element={<InternalAccess />} />
        <Route path="/interno/perfil" element={<InternalProfileGuard />} />
        <Route path="/interno/prototipo-clinico" element={<InternalClinicalGuard />} />
        <Route path="/interno/trabajadores" element={<InternalAdminGuard />} />
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
          <InternalPrototypeAuthProvider>
            <AppRouter />
            <Toaster position="top-right" />
          </InternalPrototypeAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
