import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    // Do not log credentials, clinical records or form content.
    console.error('gasi_interface_error', { component: info?.componentStack ? 'react_render' : 'unknown', name: error?.name || 'Error' });
  }
  render() {
    if (this.state.hasError) {
      return <main role="alert" className="min-h-[60vh] bg-slate-50 px-6 py-20 text-slate-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">No hemos podido mostrar esta sección</h1>
          <p className="mt-3 text-slate-600">Se ha producido un problema al cargar el contenido. Puedes volver al inicio o contactar con GASI. No introduzcas datos de salud en el formulario público.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/" className="rounded-lg bg-[#005EB8] px-5 py-3 font-semibold text-white">Volver al inicio</a>
            <a href="/contacto" className="rounded-lg border border-[#005EB8] px-5 py-3 font-semibold text-[#005EB8]">Contacto</a>
          </div>
        </div>
      </main>;
    }
    return this.props.children;
  }
}
