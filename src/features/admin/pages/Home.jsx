import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Activity, AlertCircle, Clock, ArrowUp,
  UserPlus, Stethoscope, ClipboardList, TrendingUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import NuevaCitaModal from '../components/NuevaCitaModal';

function Home() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const [stats, setStats] = useState(null);
  const [proximasCitas, setProximasCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCitaModal, setShowCitaModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [{ data: kpis, error: e1 }, { data: citas, error: e2 }] = await Promise.all([
          supabase.from('vw_admin_estadisticas').select('*').maybeSingle(),
          supabase
            .from('vw_admin_citas')
            .select('id_cita, fecha, hora, estado, paciente_nombre, medico_nombre, medico_especialidad')
            .gte('fecha', new Date().toISOString().split('T')[0])
            .order('fecha_cita', { ascending: true })
            .limit(5),
        ]);

        if (e1) throw e1;
        if (e2) throw e2;
        if (mounted) {
          setStats(kpis);
          setProximasCitas(citas ?? []);
        }
      } catch (err) {
        if (mounted) setError(err.message ?? 'Error cargando datos');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const cards = [
    { title: 'Pacientes', value: stats?.total_pacientes ?? 0, icon: Users,        color: 'blue',   sub: 'registrados' },
    { title: 'Médicos',   value: stats?.total_medicos   ?? 0, icon: Stethoscope, color: 'purple', sub: 'activos' },
    { title: 'Citas Hoy', value: stats?.citas_hoy       ?? 0, icon: Calendar,    color: 'green',  sub: `${stats?.citas_proximas ?? 0} próximas` },
    { title: 'Consultas', value: stats?.total_consultas ?? 0, icon: ClipboardList, color: 'orange', sub: 'realizadas' },
  ];

  const colors = {
    blue:   'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green:  'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
  };

  const estadoColor = (estado) => {
    const map = {
      programada: 'bg-blue-100 text-blue-700',
      confirmada: 'bg-green-100 text-green-700',
      en_curso:   'bg-yellow-100 text-yellow-700',
      completada: 'bg-gray-100 text-gray-700',
      cancelada:  'bg-red-100 text-red-700',
      no_asistio: 'bg-red-100 text-red-700',
    };
    return map[estado] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
            <p className="text-blue-100 text-lg">
              Bienvenido, {usuarioLogueado?.nombre_completo ?? usuarioLogueado?.nombres ?? 'Administrador'}
            </p>
            <p className="text-sm text-blue-100 mt-2">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
            <Activity size={40} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Sistema Activo</p>
            <p className="text-2xl font-bold">
              {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[c.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={28} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">{c.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? <span className="animate-pulse text-gray-300">···</span> : c.value}
              </p>
              <p className="text-xs text-gray-500">{c.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Próximas citas */}
        <div className="col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Próximas Citas</h2>
            <button onClick={() => navigate('/dashboard/citas')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver todas
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : proximasCitas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
              No hay citas programadas
            </div>
          ) : (
            <div className="space-y-3">
              {proximasCitas.map((c) => (
                <div key={c.id_cita} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{c.paciente_nombre ?? '—'}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Clock size={12} />
                      {c.fecha} · {c.hora?.slice(0, 5)} · {c.medico_nombre ?? 'Sin médico'}
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

        {/* Acciones rápidas */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Acciones rápidas</h2>
          <div className="space-y-3">
            <button onClick={() => setShowCitaModal(true)}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md">
              <Calendar size={20} />
              <span className="font-medium">Nueva cita</span>
            </button>
            <button onClick={() => navigate('/dashboard/usuarios')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md">
              <UserPlus size={20} />
              <span className="font-medium">Crear usuario</span>
            </button>
            <button onClick={() => navigate('/dashboard/pacientes')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-md">
              <Users size={20} />
              <span className="font-medium">Ver pacientes</span>
            </button>
            <button onClick={() => navigate('/dashboard/reportes')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition shadow-md">
              <TrendingUp size={20} />
              <span className="font-medium">Reportes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resumen secundario */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Asistentes activos</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_asistentes ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Diagnósticos registrados</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_diagnosticos ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Medicamentos en catálogo</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_medicamentos ?? 0}</p>
        </div>
      </div>

      <NuevaCitaModal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        onSave={() => { setShowCitaModal(false); navigate('/dashboard/citas'); }}
      />
    </div>
  );
}

export default Home;
