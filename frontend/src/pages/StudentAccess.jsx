import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentAccess() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.success) setError(result.error || 'No se ha podido iniciar sesión');
  };

  return (
    <main className="min-h-screen bg-slate-50 py-16 text-slate-900" data-testid="student-access">
      <div className="mx-auto max-w-md px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <GraduationCap className="h-9 w-9 text-[#005EB8]" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold">Acceso de alumnado</h1>
          <p className="mt-2 text-slate-600">Área reservada a alumnado con una cuenta habilitada por GASI.</p>
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <div>
              <label htmlFor="student-email" className="block text-sm font-semibold">Correo electrónico</label>
              <input id="student-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8]" />
            </div>
            <div>
              <label htmlFor="student-password" className="block text-sm font-semibold">Contraseña</label>
              <input id="student-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005EB8]" />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" disabled={submitting || loading} className="w-full rounded-lg bg-[#005EB8] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Comprobando…' : 'Entrar al aula'}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-500">No se permite el registro público. Si no tienes una cuenta habilitada, contacta con GASI.</p>
          <Link to="/acceso" className="mt-5 inline-block text-sm font-semibold text-[#005EB8]">Volver a accesos</Link>
        </div>
      </div>
    </main>
  );
}
