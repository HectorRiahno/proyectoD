import React, { useState, useEffect } from 'react';
import { CalendarClock, Clock, User, Phone, AlertCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function Agenda() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.from('vw_medico_agenda_hoy').select('*')
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) setCitas(data ?? []);
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando agenda'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const estadoColor = (estado) => ({
    programada: 'bg-blue-100 text-blue-700 border-blue-200',
    confirmada: 'bg-green-100 text-green-700 border-green-200',
    en_curso:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    completada: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelada:  'bg-red-100 text-red-700 border-red-200',
    no_asistio: 'bg-orange-100 text-orange-700 border-orange-200',
  }[estado] ?? 'bg-gray-100 text-gray-700');

  const hoyFmt = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Agenda de hoy</h1>
            <p className="text-emerald-100 capitalize">{hoyFmt}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Citas</p>
            <p className="text-4xl font-bold">{loading ? '···' : citas.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando agenda...</p>
        </div>
      ) : citas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <CalendarClock size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No tienes citas programadas para hoy</p>
        </div>
      ) : (
        <div className="space-y-4">
          {citas.map((c) => (
            <div key={c.id_cita} className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition overflow-hidden">
              <div className="flex">
                {/* Hora destacada */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 flex flex-col items-center justify-center min-w-[120px]">
                  <Clock size={20} className="mb-1 opacity-80" />
                  <p className="text-2xl font-bold">{c.hora?.slice(0, 5)}</p>
                  <p className="text-xs opacity-80 mt-1">{c.tipo_consulta ?? 'Consulta'}</p>
                </div>

                {/* Datos del paciente */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {(c.paciente_nombre ?? '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{c.paciente_nombre ?? '—'}</p>
                        <p className="text-sm text-gray-500">
                          Doc: {c.paciente_documento ?? '—'}
                          {c.paciente_edad != null && ` · ${c.paciente_edad} años`}
                          {c.numero_historia && ` · HC ${c.numero_historia}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium border ${estadoColor(c.estado)}`}>
                      {c.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {c.motivo && (
                      <div className="col-span-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Motivo</p>
                        <p className="text-gray-800">{c.motivo}</p>
                      </div>
                    )}
                    {c.paciente_telefono && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} className="text-emerald-600" />
                        {c.paciente_telefono}
                      </div>
                    )}
                    {c.paciente_email && (
                      <div className="flex items-center gap-2 text-gray-600 col-span-2 truncate">
                        <Mail size={14} className="text-emerald-600" />
                        <span className="truncate">{c.paciente_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
