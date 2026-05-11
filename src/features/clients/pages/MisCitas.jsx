import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Loader2, Stethoscope, MapPin, FileText } from 'lucide-react';
import citaService from '../../../services/citaService';

const FILTROS = [
  { value: 'todas',     label: 'Todas' },
  { value: 'proximas',  label: 'Próximas' },
  { value: 'pasadas',   label: 'Pasadas' },
];

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    let mounted = true;
    citaService.getMisCitasPaciente()
      .then((data) => { if (mounted) setCitas(data); })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando citas'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const hoy = new Date().toISOString().split('T')[0];
  const filtered = citas.filter((c) => {
    if (filtro === 'proximas') return c.fecha >= hoy;
    if (filtro === 'pasadas')  return c.fecha < hoy;
    return true;
  });

  const estadoColor = (estado) => ({
    programada: 'bg-blue-100 text-blue-700 border-blue-200',
    confirmada: 'bg-green-100 text-green-700 border-green-200',
    en_curso:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    completada: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelada:  'bg-red-100 text-red-700 border-red-200',
    no_asistio: 'bg-orange-100 text-orange-700 border-orange-200',
  }[estado] ?? 'bg-gray-100 text-gray-700');

  const counts = {
    todas:    citas.length,
    proximas: citas.filter((c) => c.fecha >= hoy).length,
    pasadas:  citas.filter((c) => c.fecha < hoy).length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis citas</h1>
            <p className="text-sky-100">Tu agenda médica</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-sky-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : citas.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtro === f.value
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label} <span className="ml-1 text-xs opacity-80">({counts[f.value]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-gray-500">Cargando citas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No tienes citas {filtro !== 'todas' ? filtro : 'registradas'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <div key={c.id_cita} className="bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-100 overflow-hidden">
              <div className="flex">
                <div className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white p-6 flex flex-col items-center justify-center min-w-[120px]">
                  <Calendar size={20} className="mb-1 opacity-80" />
                  <p className="text-xs font-medium">{new Date(c.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</p>
                  <p className="text-xl font-bold mt-1">{c.hora?.slice(0, 5)}</p>
                </div>

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-sky-100 rounded-lg p-2">
                        <Stethoscope size={20} className="text-sky-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{c.medico_nombre ?? 'Médico asignado'}</p>
                        <p className="text-sm text-gray-500">{c.medico_especialidad ?? 'Consulta general'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium border ${estadoColor(c.estado)}`}>
                      {c.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {c.tipo_consulta && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText size={14} className="text-sky-600" />
                        {c.tipo_consulta}
                      </div>
                    )}
                    {c.medico_consultorio && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} className="text-sky-600" />
                        Consultorio {c.medico_consultorio}
                      </div>
                    )}
                  </div>

                  {c.motivo && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Motivo</p>
                      <p className="text-sm text-gray-800">{c.motivo}</p>
                    </div>
                  )}

                  {c.observaciones && (
                    <div className="mt-2 bg-sky-50 rounded-lg p-3">
                      <p className="text-xs text-sky-700 font-medium mb-1">Observaciones</p>
                      <p className="text-sm text-sky-900">{c.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
