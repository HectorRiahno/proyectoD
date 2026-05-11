import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, Pill, Activity, AlertCircle, Clock,
  Stethoscope, ChevronRight, Heart, ClipboardList
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [proximas, setProximas] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [ultimoSigno, setUltimoSigno] = useState(null);
  const [counts, setCounts] = useState({ citas: 0, consultas: 0, diagnosticos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [
          { data: p },
          { data: prox },
          { data: meds },
          { data: signos },
          { count: cCitas },
          { count: cConsultas },
          { count: cDx },
        ] = await Promise.all([
          supabase.from('vw_paciente_mi_perfil').select('*').maybeSingle(),
          supabase.from('vw_paciente_proximas_citas').select('*').limit(3),
          supabase.from('vw_paciente_mis_medicamentos').select('*').limit(3),
          supabase.from('vw_paciente_mis_signos').select('*').limit(1).maybeSingle(),
          supabase.from('vw_paciente_mis_citas').select('*', { count: 'exact', head: true }),
          supabase.from('vw_paciente_mi_historial').select('*', { count: 'exact', head: true }),
          supabase.from('vw_paciente_mis_diagnosticos').select('*', { count: 'exact', head: true }),
        ]);
        if (mounted) {
          setPerfil(p);
          setProximas(prox ?? []);
          setMedicamentos(meds ?? []);
          setUltimoSigno(signos);
          setCounts({ citas: cCitas ?? 0, consultas: cConsultas ?? 0, diagnosticos: cDx ?? 0 });
        }
      } catch (err) {
        if (mounted) setError(err.message ?? 'Error cargando información');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const estadoColor = (estado) => ({
    programada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-green-100 text-green-700',
    en_curso:   'bg-yellow-100 text-yellow-700',
    completada: 'bg-gray-100 text-gray-700',
    cancelada:  'bg-red-100 text-red-700',
    no_asistio: 'bg-orange-100 text-orange-700',
  }[estado] ?? 'bg-gray-100 text-gray-700');

  const stats = [
    { title: 'Próximas citas',     value: proximas.length,    icon: Calendar,      color: 'sky',     path: '/cliente/citas' },
    { title: 'Consultas',          value: counts.consultas,    icon: ClipboardList, color: 'cyan',    path: '/cliente/historial' },
    { title: 'Medicamentos',       value: medicamentos.length, icon: Pill,          color: 'teal',    path: '/cliente/medicamentos' },
    { title: 'Diagnósticos',       value: counts.diagnosticos, icon: Stethoscope,   color: 'indigo',  path: '/cliente/resultados' },
  ];

  const colors = {
    sky:    'from-sky-500 to-cyan-600',
    cyan:   'from-cyan-500 to-teal-600',
    teal:   'from-teal-500 to-emerald-600',
    indigo: 'from-indigo-500 to-purple-600',
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Hola, {perfil?.nombres ?? usuarioLogueado?.nombres ?? 'paciente'} 👋
            </h1>
            <p className="text-sky-100">Bienvenido a tu portal de salud</p>
            <p className="text-sm text-sky-100 mt-2 capitalize">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {perfil?.numero_historia && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-5 text-center">
              <FileText size={32} className="mx-auto mb-2" />
              <p className="text-xs opacity-80">Historia clínica</p>
              <p className="text-xl font-bold font-mono">{perfil.numero_historia}</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(s.path)}
              className="text-left bg-white rounded-xl shadow-md hover:shadow-xl transition p-5 border border-gray-100 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[s.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={22} />
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-sky-600 transition" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse text-gray-300">···</span> : s.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.title}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Próximas citas */}
        <div className="col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800">Próximas citas</h2>
            <button onClick={() => navigate('/cliente/citas')} className="text-sm text-sky-600 hover:text-sky-700 font-medium">
              Ver todas
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : proximas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No tienes citas programadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proximas.map((c) => (
                <div key={c.id_cita} className="flex items-center gap-4 p-4 rounded-lg hover:bg-sky-50 transition border border-gray-100">
                  <div className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white rounded-lg p-3 w-16 text-center">
                    <p className="text-xs opacity-80">{c.hora?.slice(0, 5)}</p>
                    <p className="text-xs font-medium mt-1">{c.fecha?.slice(5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.medico_nombre ?? 'Médico'}</p>
                    <p className="text-xs text-gray-500">
                      {c.medico_especialidad ?? 'Especialidad'}
                      {c.medico_consultorio && ` · Consultorio ${c.medico_consultorio}`}
                    </p>
                    {c.motivo && <p className="text-xs text-gray-600 mt-1 truncate">📋 {c.motivo}</p>}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${estadoColor(c.estado)}`}>
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-6">
          {/* Medicamentos activos */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Medicamentos</h3>
              <button onClick={() => navigate('/cliente/medicamentos')} className="text-xs text-sky-600 hover:text-sky-700">
                Ver
              </button>
            </div>
            {loading ? (
              <div className="text-sm text-gray-400">Cargando...</div>
            ) : medicamentos.length === 0 ? (
              <p className="text-sm text-gray-500">Sin medicamentos activos</p>
            ) : (
              <div className="space-y-2">
                {medicamentos.map((m) => (
                  <div key={m.id_orden} className="flex items-start gap-2 p-2 bg-sky-50 rounded-lg">
                    <Pill size={16} className="text-sky-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.medicamento_nombre}</p>
                      <p className="text-xs text-gray-600">{m.dosis} · {m.frecuencia}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Últimos signos vitales */}
          {ultimoSigno && (
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Heart className="text-red-500" size={18} /> Últimos signos
              </h3>
              <div className="space-y-2 text-sm">
                {ultimoSigno.presion_sistolica && (
                  <Row label="Presión" value={`${ultimoSigno.presion_sistolica}/${ultimoSigno.presion_diastolica}`} />
                )}
                {ultimoSigno.frecuencia_cardiaca && (
                  <Row label="Frec. cardíaca" value={`${ultimoSigno.frecuencia_cardiaca} bpm`} />
                )}
                {ultimoSigno.temperatura && (
                  <Row label="Temperatura" value={`${ultimoSigno.temperatura} °C`} />
                )}
                {ultimoSigno.peso && (
                  <Row label="Peso" value={`${ultimoSigno.peso} kg`} />
                )}
                <p className="text-xs text-gray-500 pt-2 border-t">
                  {ultimoSigno.fecha_registro
                    ? new Date(ultimoSigno.fecha_registro).toLocaleDateString('es-ES')
                    : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl shadow-sm border border-sky-200 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Activity size={16} className="text-sky-600" /> Tip de salud
            </h3>
            <p className="text-sm text-gray-700">
              Toma tus medicamentos según las indicaciones, mantén una dieta balanceada y realiza actividad física regularmente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
