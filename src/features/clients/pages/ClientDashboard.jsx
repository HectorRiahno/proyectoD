import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Activity, Heart, ClipboardList,
} from 'lucide-react';
import { useAuth, useDashboardCliente } from '../../../hooks';
import {
  PageHero, LiveTimeBadge, StatCard, Panel, PanelLink,
  StatusPill, EmptyState, ListRow, ErrorBlock,
} from '../../dashboard/ui/dashboardUI';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const {
    perfil, proximas, ultimoSigno, counts, loading, error,
  } = useDashboardCliente();

  const greeting = greetingForHour(new Date().getHours());
  const userName = perfil?.nombres ?? usuarioLogueado?.nombres ?? 'paciente';
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const stats = [
    { label: 'Próximas citas', value: proximas.length,  icon: Calendar,      path: '/cliente/citas' },
    { label: 'Consultas',      value: counts.consultas, icon: ClipboardList, path: '/cliente/historial' },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Mi salud"
        title={<>{greeting}, <span className="text-ink-700 font-normal">{userName}.</span></>}
        subtitle={today}
        side={<LiveTimeBadge />}
      />

      <ErrorBlock message={error} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            loading={loading}
            onClick={() => navigate(s.path)}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Próximas citas */}
        <Panel
          className="lg:col-span-2"
          title="Próximas citas"
          subtitle="Tus consultas programadas"
          action={<PanelLink onClick={() => navigate('/cliente/citas')}>Ver todas</PanelLink>}
        >
          {loading ? (
            <SkeletonList />
          ) : proximas.length === 0 ? (
            <EmptyState icon={Calendar} title="No tienes citas programadas" hint="Tu médico o el centro te asignará una cuando corresponda." />
          ) : (
            <ul className="-mx-3 divide-y divide-line/60">
              {proximas.map((c) => (
                <li key={c.id_cita}>
                  <ListRow
                    leading={
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-[0_6px_18px_-8px_rgba(30,79,216,0.5)]">
                        <span className="text-[10px] uppercase tracking-wide opacity-80 leading-none">
                          {c.fecha?.slice(5, 10) ?? '—'}
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums leading-none mt-1">
                          {c.hora?.slice(0, 5) ?? '—'}
                        </span>
                      </div>
                    }
                    title={c.medico_nombre ?? 'Médico'}
                    subtitle={
                      <>
                        <span>{c.medico_especialidad ?? 'Especialidad'}</span>
                        {c.medico_consultorio && (
                          <>
                            <span className="mx-1.5 text-ink-300">·</span>
                            <span>Consultorio {c.medico_consultorio}</span>
                          </>
                        )}
                        {c.motivo && (
                          <>
                            <span className="mx-1.5 text-ink-300">·</span>
                            <span className="text-ink-700">{c.motivo}</span>
                          </>
                        )}
                      </>
                    }
                    trailing={<StatusPill estado={c.estado} />}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Últimos signos vitales */}
          {ultimoSigno && (
            <Panel
              title={
                <span className="inline-flex items-center gap-2">
                  <Heart size={14} className="text-red-500" strokeWidth={2} />
                  Últimos signos
                </span>
              }
              subtitle={
                ultimoSigno.fecha_registro
                  ? `Registrados el ${new Date(ultimoSigno.fecha_registro).toLocaleDateString('es-ES')}`
                  : null
              }
            >
              <dl className="space-y-2.5">
                {ultimoSigno.presion_sistolica && (
                  <SignoRow label="Presión" value={`${ultimoSigno.presion_sistolica}/${ultimoSigno.presion_diastolica}`} unit="mmHg" />
                )}
                {ultimoSigno.frecuencia_cardiaca && (
                  <SignoRow label="Frec. cardíaca" value={ultimoSigno.frecuencia_cardiaca} unit="bpm" />
                )}
                {ultimoSigno.temperatura && (
                  <SignoRow label="Temperatura" value={ultimoSigno.temperatura} unit="°C" />
                )}
                {ultimoSigno.peso && (
                  <SignoRow label="Peso" value={ultimoSigno.peso} unit="kg" />
                )}
              </dl>
            </Panel>
          )}

          {/* Tip — más discreto que el original */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
            <div
              aria-hidden
              className="absolute -top-12 -right-10 w-40 h-40 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(110,231,215,0.30), transparent 65%)' }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-medium text-accent-500 mb-2">
                <Activity size={11} strokeWidth={2.25} /> Tip de salud
              </div>
              <p className="text-[13px] text-ink-700 leading-relaxed">
                Toma tus medicamentos según las indicaciones, mantén una dieta balanceada
                y realiza actividad física regularmente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignoRow({ label, value, unit }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className="text-[13.5px] font-semibold text-ink-900 tabular-nums">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-ink-500">{unit}</span>}
      </dd>
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
