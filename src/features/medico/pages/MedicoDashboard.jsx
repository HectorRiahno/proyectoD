import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Users, ClipboardList, CalendarClock, ArrowRight,
} from 'lucide-react';
import { useAuth, useDashboardMedico } from '../../../hooks';
import {
  PageHero, LiveTimeBadge, StatCard, Panel, PanelLink,
  StatusPill, EmptyState, ListRow, ErrorBlock,
} from '../../dashboard/ui/dashboardUI';

export default function MedicoDashboard() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const { agenda, proximas, counts, loading, error } = useDashboardMedico();

  const greeting = greetingForHour(new Date().getHours());
  const doctorName = usuarioLogueado?.nombres ?? 'Doctor(a)';
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const stats = [
    { label: 'Citas hoy',     value: agenda.length,    icon: CalendarClock, path: '/medico/agenda' },
    { label: 'Mis pacientes', value: counts.pacientes, icon: Users,         path: '/medico/pacientes' },
    { label: 'Consultas',     value: counts.consultas, icon: ClipboardList, path: '/medico/consultas' },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Mi consulta"
        title={
          <>
            {greeting}, Dr(a). <span className="text-ink-700 font-normal">{doctorName}.</span>
          </>
        }
        subtitle={
          <>
            {today}
            {usuarioLogueado?.especialidad && (
              <span className="ml-2 text-ink-300">·</span>
            )}
            {usuarioLogueado?.especialidad && (
              <span className="ml-2">{usuarioLogueado.especialidad}</span>
            )}
          </>
        }
        side={<LiveTimeBadge />}
        accent="accent"
      />

      <ErrorBlock message={error} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            loading={loading}
            onClick={() => navigate(s.path)}
            accent="accent"
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Agenda de hoy */}
        <Panel
          title="Agenda de hoy"
          subtitle="Citas programadas para hoy"
          action={<PanelLink onClick={() => navigate('/medico/agenda')}>Ver completa</PanelLink>}
        >
          {loading ? (
            <SkeletonList />
          ) : agenda.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No tienes citas para hoy" hint="Te avisaremos cuando se agende una nueva." />
          ) : (
            <ul className="-mx-3 divide-y divide-line/60">
              {agenda.slice(0, 5).map((c) => (
                <li key={c.id_cita}>
                  <ListRow
                    leading={
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-accent-500/8 border border-accent-500/15 text-accent-500">
                        <span className="text-[12px] font-semibold tabular-nums leading-none">
                          {c.hora?.slice(0, 5) ?? '—'}
                        </span>
                      </div>
                    }
                    title={c.paciente_nombre ?? '—'}
                    subtitle={c.motivo ?? 'Sin motivo registrado'}
                    trailing={<StatusPill estado={c.estado} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Próximas citas */}
        <Panel
          title="Próximas citas"
          subtitle="Programadas para los próximos días"
          action={<PanelLink onClick={() => navigate('/medico/citas')}>Ver todas</PanelLink>}
        >
          {loading ? (
            <SkeletonList />
          ) : proximas.length === 0 ? (
            <EmptyState icon={Calendar} title="Sin próximas citas" />
          ) : (
            <ul className="-mx-3 divide-y divide-line/60">
              {proximas.map((c) => (
                <li key={c.id_cita}>
                  <ListRow
                    leading={
                      <span className="inline-flex w-10 h-10 items-center justify-center rounded-lg bg-brand-50 border border-brand-100 text-brand-700">
                        <Calendar size={16} strokeWidth={1.75} />
                      </span>
                    }
                    title={c.paciente_nombre ?? '—'}
                    subtitle={
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={11} strokeWidth={1.75} className="text-ink-300" />
                        {c.fecha} · {c.hora?.slice(0, 5)} · {c.tipo_consulta ?? 'Consulta'}
                      </span>
                    }
                    trailing={<StatusPill estado={c.estado} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function greetingForHour(h) {
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function SkeletonList({ rows = 4 }) {
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
