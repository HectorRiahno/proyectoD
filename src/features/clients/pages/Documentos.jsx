import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileDown, AlertCircle, Loader2, Calendar, Pill, ClipboardList, Activity } from 'lucide-react';
import { useDashboardCliente } from '../../../hooks';

export default function Documentos() {
  const navigate = useNavigate();
  const { counts: full, loading, error } = useDashboardCliente();
  const counts = {
    consultas:    full.consultas,
    recetas:      full.medicamentos,
    diagnosticos: full.diagnosticos,
    signos:       full.signos,
  };

  const docs = [
    {
      title: 'Historia clínica',
      description: 'Registro completo de todas tus consultas médicas',
      icon: FileText,
      color: 'sky',
      count: counts.consultas,
      path: '/cliente/historial',
    },
    {
      title: 'Recetas médicas',
      description: 'Medicamentos y tratamientos prescritos',
      icon: Pill,
      color: 'cyan',
      count: counts.recetas,
      path: '/cliente/medicamentos',
    },
    {
      title: 'Diagnósticos',
      description: 'Diagnósticos con códigos CIE-10',
      icon: ClipboardList,
      color: 'teal',
      count: counts.diagnosticos,
      path: '/cliente/resultados',
    },
    {
      title: 'Signos vitales',
      description: 'Registros de presión, temperatura, peso, etc.',
      icon: Activity,
      color: 'indigo',
      count: counts.signos,
      path: '/cliente/resultados',
    },
  ];

  const colors = {
    sky:    'from-sky-500 to-cyan-600',
    cyan:   'from-cyan-500 to-teal-600',
    teal:   'from-teal-500 to-emerald-600',
    indigo: 'from-indigo-500 to-purple-600',
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis documentos</h1>
            <p className="text-sky-100">Accede a toda tu información médica</p>
          </div>
          <FileDown size={48} className="opacity-50" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-gray-500">Cargando documentos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((d, i) => {
            const Icon = d.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(d.path)}
                className="text-left bg-white rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[d.color]} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900">{d.title}</h3>
                      <span className="text-xs font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
                        {d.count}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{d.description}</p>
                    <p className="text-xs text-sky-600 font-medium mt-3 group-hover:translate-x-1 transition">
                      Ver documentos →
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-6 flex items-start gap-3">
        <div className="bg-sky-100 rounded-lg p-2 flex-shrink-0">
          <AlertCircle size={20} className="text-sky-600" />
        </div>
        <div className="text-sm text-sky-900">
          <p className="font-semibold mb-1">Sobre tus documentos médicos</p>
          <p>
            Toda tu información médica está protegida y solo es accesible para ti y el personal médico autorizado.
            Si necesitas una copia física de algún documento, contacta a la administración del centro.
          </p>
        </div>
      </div>
    </div>
  );
}
