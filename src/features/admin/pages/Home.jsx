import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Stethoscope, ClipboardList, Clock,
  UserPlus, TrendingUp, Pill, FileCheck2,
} from 'lucide-react';
import { useAuth, useDashboardAdmin } from '../../../hooks';
import NuevaCitaModal from '../components/NuevaCitaModal';
import {
  PageHero, LiveTimeBadge, StatCard, Panel, PanelLink,
  StatusPill, EmptyState, ListRow, ActionList, ErrorBlock,
} from '../../dashboard/ui/dashboardUI';

function Home() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const { stats, proximasCitas, loading, error } = useDashboardAdmin(5);
  const [showCitaModal, setShowCitaModal] = useState(false);

  const greeting = greetingForHour(new Date().getHours());
  const userName = usuarioLogueado?.nombre_completo ?? usuarioLogueado?.nombres ?? 'Administrador';
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const primaryStats = [
    { label: 'Pacientes',  value: stats?.total_pacientes ?? 0, sub: 'registrados',                        icon: Users,         path: '/dashboard/pacientes' },
    { label: 'Médicos',    value: stats?.total_medicos   ?? 0, sub: 'activos',                            icon: Stethoscope,   path: '/dashboard/medicos' },
    { label: 'Citas hoy',  value: stats?.citas_hoy       ?? 0, sub: `${stats?.citas_proximas ?? 0} próximas`, icon: Calendar,  path: '/dashboard/citas' },
    { label: 'Consultas',  value: stats?.total_consultas ?? 0, sub: 'realizadas',                         icon: ClipboardList, path: '/dashboard/consultas' },
  ];

  const secondaryStats = [
    { label: 'Asistentes activos',       value: stats?.total_asistentes    ?? 0, icon: Users },
    { label: 'Diagnósticos registrados', value: stats?.total_diagnosticos ?? 0, icon: FileCheck2 },
    { label: 'Medicamentos en catálogo', value: stats?.total_medicamentos ?? 0, icon: Pill },
  ];

  const actions = [
    { icon: Calendar,    label: 'Nueva cita',     desc: 'Programa una nueva consulta',          onClick: () => setShowCitaModal(true),         primary: true },
    { icon: UserPlus,    label: 'Crear usuario',  desc: 'Médico, asistente o paciente',         onClick: () => navigate('/dashboard/usuarios') },
    { icon: Users,       label: 'Ver pacientes',  desc: 'Listado completo e historiales',       onClick: () => navigate('/dashboard/pacientes') },
    { icon: TrendingUp,  label: 'Reportes',       desc: 'Indicadores y exportaciones',          onClick: () => navigate('/dashboard/reportes') },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Panel de administración"
        title={<>{greeting}, <span className="text-ink-700 font-normal">{userName}.</span></>}
        subtitle={today}
        side={<LiveTimeBadge />}
      />

      <ErrorBlock message={error} />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            icon={s.icon}
            loading={loading}
            onClick={() => navigate(s.path)}
          />
        ))}
      </div>

      {/* Próximas citas + Acciones */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Próximas citas"
          subtitle="Próximas 5 programadas en el sistema"
          action={<PanelLink onClick={() => navigate('/dashboard/citas')}>Ver todas</PanelLink>}
        >
          {loading ? (
            <SkeletonList rows={4} />
          ) : proximasCitas.length === 0 ? (
            <EmptyState icon={Calendar} title="No hay citas programadas" hint="Crea una nueva cita desde acciones rápidas." />
          ) : (
            <ul className="-mx-3 divide-y divide-line/60">
              {proximasCitas.map((c) => (
                <li key={c.id_cita}>
                  <ListRow
                    onClick={() => navigate('/dashboard/citas')}
                    leading={
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-surface border border-line text-ink-700">
                        <span className="text-[10px] uppercase tracking-wide text-ink-500 leading-none">
                          {c.fecha?.slice(5, 10) ?? '—'}
                        </span>
                        <span className="text-[12.5px] font-semibold tabular-nums leading-none mt-1">
                          {c.hora?.slice(0, 5) ?? '—'}
                        </span>
                      </div>
                    }
                    title={c.paciente_nombre ?? '—'}
                    subtitle={
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={11} strokeWidth={1.75} className="text-ink-300" />
                        {c.medico_nombre ?? 'Sin médico'}
                      </span>
                    }
                    trailing={<StatusPill estado={c.estado} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Acciones rápidas" subtitle="Atajos a las operaciones del día">
          <ActionList items={actions} />
        </Panel>
      </div>

      {/* Stats secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {secondaryStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} loading={loading} />
        ))}
      </div>

      <NuevaCitaModal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        onSave={() => { setShowCitaModal(false); navigate('/dashboard/citas'); }}
      />
    </div>
  );
}

function greetingForHour(h) {
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function SkeletonList({ rows = 3 }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 py-3">
          <div className="w-12 h-12 rounded-lg bg-line/50 motion-safe:animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-line/50 motion-safe:animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-line/40 motion-safe:animate-pulse" />
          </div>
          <div className="w-16 h-5 rounded bg-line/50 motion-safe:animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

export default Home;
