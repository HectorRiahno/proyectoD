import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Users, ClipboardList, AlertCircle,
  CalendarClock, Activity, ArrowRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

export default function MedicoDashboard() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const [agenda, setAgenda] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [counts, setCounts] = useState({ pacientes: 0, consultas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [
          { data: hoy, error: e1 },
          { data: prox, error: e2 },
          { count: cPacientes },
          { count: cConsultas },
        ] = await Promise.all([
          supabase.from('vw_medico_agenda_hoy').select('*'),
          supabase
            .from('vw_medico_mis_citas')
            .select('id_cita, fecha, hora, estado, paciente_nombre, motivo, tipo_consulta')
            .gte('fecha', new Date().toISOString().split('T')[0])
            .order('fecha_cita', { ascending: true })
            .limit(5),
          supabase.from('vw_medico_mis_pacientes').select('*', { count: 'exact', head: true }),
          supabase.from('vw_medico_consultas').select('*', { count: 'exact', head: true }),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        if (mounted) {
          setAgenda(hoy ?? []);
          setProximas(prox ?? []);
          setCounts({
            pacientes: cPacientes ?? 0,
            consultas: cConsultas ?? 0,
          });
        }
      } catch (err) {
        if (mounted) setError(err.message ?? 'Error cargando dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const cards = [
    { title: 'Citas hoy',     value: agenda.length,    icon: CalendarClock, color: 'emerald', path: '/medico/agenda' },
    { title: 'Mis pacientes', value: counts.pacientes, icon: Users,         color: 'blue',    path: '/medico/pacientes' },
    { title: 'Consultas',     value: counts.consultas, icon: ClipboardList, color: 'purple',  path: '/medico/consultas' },
  ];

  const colors = {
    emerald: 'from-emerald-500 to-teal-600',
    blue:    'from-blue-500 to-indigo-600',
    purple:  'from-purple-500 to-pink-600',
  };

  const estadoColor = (estado) => ({
    programada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-green-100 text-green-700',
    en_curso:   'bg-yellow-100 text-yellow-700',
    completada: 'bg-gray-100 text-gray-700',
    cancelada:  'bg-red-100 text-red-700',
    no_asistio: 'bg-orange-100 text-orange-700',
  }[estado] ?? 'bg-gray-100 text-gray-700');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bienvenido, Dr(a). {usuarioLogueado?.nombres ?? 'Médico'}
            </h1>
            <p className="text-emerald-100">{usuarioLogueado?.especialidad ?? 'Profesional médico'}</p>
            <p className="text-sm text-emerald-100 mt-2">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
            <Activity size={40} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Activo</p>
            <p className="text-2xl font-bold">
              {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(c.path)}
              className="text-left bg-white rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[c.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={28} />
                </div>
                <ArrowRight className="text-gray-300 group-hover:text-emerald-600 transition" size={20} />
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{c.title}</h3>
              <p className="text-3xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse text-gray-300">···</span> : c.value}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Agenda de hoy */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Agenda de hoy</h2>
              <p className="text-sm text-gray-500">Citas programadas para hoy</p>
            </div>
            <button onClick={() => navigate('/medico/agenda')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Ver completa
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : agenda.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarClock size={32} className="mx-auto mb-2 text-gray-300" />
              No tienes citas para hoy
            </div>
          ) : (
            <div className="space-y-3">
              {agenda.slice(0, 5).map((c) => (
                <div key={c.id_cita} className="flex items-center gap-4 p-3 rounded-lg hover:bg-emerald-50 transition border border-gray-100">
                  <div className="bg-emerald-100 rounded-lg p-2 w-14 text-center">
                    <p className="text-xs text-emerald-700 font-semibold">{c.hora?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.paciente_nombre ?? '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{c.motivo ?? 'Sin motivo registrado'}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${estadoColor(c.estado)}`}>
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas citas */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Próximas citas</h2>
              <p className="text-sm text-gray-500">Programadas para los próximos días</p>
            </div>
            <button onClick={() => navigate('/medico/citas')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Ver todas
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : proximas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
              Sin próximas citas
            </div>
          ) : (
            <div className="space-y-3">
              {proximas.map((c) => (
                <div key={c.id_cita} className="flex items-center gap-4 p-3 rounded-lg hover:bg-blue-50 transition border border-gray-100">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <Calendar size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.paciente_nombre ?? '—'}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Clock size={12} />
                      {c.fecha} · {c.hora?.slice(0, 5)} · {c.tipo_consulta ?? 'Consulta'}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${estadoColor(c.estado)}`}>
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
