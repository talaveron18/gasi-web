import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-16" aria-labelledby="not-found-title">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Error 404</p>
        <h1 id="not-found-title" className="mt-3 text-4xl font-bold text-slate-900">
          Página no encontrada
        </h1>
        <p className="mt-4 text-base text-slate-600">
          La dirección que has abierto no existe o ha cambiado. Puedes volver al inicio o consultar los servicios de GASI.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Volver al inicio
          </Link>
          <Link
            to="/servicios"
            className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Ver servicios
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
