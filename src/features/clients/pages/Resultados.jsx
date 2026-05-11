import React, { useState, useEffect } from 'react';
import {
  Heart, AlertCircle, Loader2, ClipboardList, Calendar, Activity,
  Thermometer, Wind, Star
} from 'lucide-react';
import historialService from '../../../services/historialService';

export default function Resultados() {
  const [signos, setSignos] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('signos');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      historialService.getMisSignos(),
      historialService.getMisDiagnosticos(),
    ])
      .then(([s, d]) => {
        if (mounted) {
          setSignos(s);
          setDiagnosticos(d);
        }
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando resultados'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Resultados</h1>
            <p className="text-sky-100">Signos vitales y diagnósticos registrados</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md p-2 border border-gray-100 flex gap-2">
        <Tab activo={tab === 'signos'} onClick={() => setTab('signos')} icon={<Heart size={16} />} label={`Signos vitales (${signos.length})`} />
        <Tab activo={tab === 'dx'}     onClick={() => setTab('dx')}     icon={<ClipboardList size={16} />} label={`Diagnósticos (${diagnosticos.length})`} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-gray-500">Cargando resultados...</p>
        </div>
      ) : tab === 'signos' ? (
        <SignosVitales signos={signos} />
      ) : (
        <Diagnosticos diagnosticos={diagnosticos} />
      )}
    </div>
  );
}

function Tab({ activo, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
        activo ? 'bg-sky-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SignosVitales({ signos }) {
  if (signos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <Heart size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No tienes signos vitales registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signos.map((s) => (
        <div key={s.id_signos} className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-sky-600" size={18} />
              Registro de signos vitales
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={12} />
              {s.fecha_registro ? new Date(s.fecha_registro).toLocaleString('es-ES') : '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(s.presion_sistolica || s.presion_diastolica) && (
              <Metric
                icon={<Heart size={16} className="text-red-500" />}
                label="Presión arterial"
                value={`${s.presion_sistolica ?? '—'}/${s.presion_diastolica ?? '—'}`}
                unit="mmHg"
                color="red"
              />
            )}
            {s.frecuencia_cardiaca && (
              <Metric
                icon={<Activity size={16} className="text-pink-500" />}
                label="Frec. cardíaca"
                value={s.frecuencia_cardiaca}
                unit="bpm"
                color="pink"
              />
            )}
            {s.frecuencia_respiratoria && (
              <Metric
                icon={<Wind size={16} className="text-blue-500" />}
                label="Frec. respiratoria"
                value={s.frecuencia_respiratoria}
                unit="rpm"
                color="blue"
              />
            )}
            {s.temperatura && (
              <Metric
                icon={<Thermometer size={16} className="text-orange-500" />}
                label="Temperatura"
                value={s.temperatura}
                unit="°C"
                color="orange"
              />
            )}
            {s.saturacion_oxigeno && (
              <Metric label="SpO₂"   value={s.saturacion_oxigeno} unit="%"  color="cyan" />
            )}
            {s.peso && (
              <Metric label="Peso"   value={s.peso}                 unit="kg" color="purple" />
            )}
            {s.talla && (
              <Metric label="Talla"  value={s.talla}                unit="m"  color="indigo" />
            )}
          </div>

          {s.observaciones && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-800">{s.observaciones}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Metric({ icon, label, value, unit, color = 'gray' }) {
  const colors = {
    red:    'bg-red-50 border-red-200 text-red-900',
    pink:   'bg-pink-50 border-pink-200 text-pink-900',
    blue:   'bg-blue-50 border-blue-200 text-blue-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    cyan:   'bg-cyan-50 border-cyan-200 text-cyan-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    gray:   'bg-gray-50 border-gray-200 text-gray-900',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80 mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-xl font-bold">
        {value} <span className="text-xs font-normal opacity-70">{unit}</span>
      </p>
    </div>
  );
}

function Diagnosticos({ diagnosticos }) {
  if (diagnosticos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No tienes diagnósticos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {diagnosticos.map((d) => (
        <div key={d.id_diagnostico} className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex items-start gap-4">
          <div className="bg-sky-100 rounded-lg p-3 flex-shrink-0">
            <ClipboardList size={20} className="text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {d.codigo_cie10 && (
                  <span className="font-mono text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">
                    {d.codigo_cie10}
                  </span>
                )}
                {d.es_principal && (
                  <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium">
                    <Star size={10} className="fill-yellow-500" /> Principal
                  </span>
                )}
                {d.tipo_diagnostico && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {d.tipo_diagnostico}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Calendar size={12} />
                {d.fecha?.slice(0, 10) ?? '—'}
              </p>
            </div>
            <p className="text-sm text-gray-800 mb-2">{d.descripcion}</p>
            {d.medico_nombre && (
              <p className="text-xs text-gray-500">Emitido por {d.medico_nombre}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
