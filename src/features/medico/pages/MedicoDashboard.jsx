import React from 'react';

export default function MedicoDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-semibold text-gray-900">Panel de médico</h1>
          <p className="mt-3 text-gray-600">Bienvenido al panel de trabajo para médicos. Aquí puedes ver tus pacientes, agenda y resultados.</p>
        </div>
      </div>
    </div>
  );
}
