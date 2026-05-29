import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Stethoscope, CheckCircle2, ClipboardList, Hourglass, Search,
} from 'lucide-react';
import { useCitas } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, SearchBar, EstadoBadge,
  EmptyState, LoadingState, Avatar,
} from '../../../shared/components/ui';

export default function MisCitas() {
  const navigate = useNavigate();
  const {
    citas, loading, error, setError, marcarEnCurso,
  } = useCitas({ role: 'medico', realtime: true });
  const [search, setSearch] = useState('');
  // Filtro adicional solo para la columna de confirmadas. Permite al médico
  // localizar rápido un paciente entre los que ya están confirmados, sin
  // afectar la lista de programadas.
  const [searchConfirmadas, setSearchConfirmadas] = useState('');

  const tomarCita = async (cita) => {
    setError('');
    if (cita.estado !== 'en_curso') {
      try { await marcarEnCurso(cita.id_cita); }
      catch (err) { setError(err.message); return; }
    }
    navigate(`/medico/atender/${cita.id_cita}`);
  };

  const matchSearch = (c) => {
    const term = search.toLowerCase();
    return (
      (c.paciente_nombre    ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento ?? '').includes(search) ||
      (c.motivo             ?? '').toLowerCase().includes(term)
    );
  };

  // "Primero en llegar" = ordenar ascendente por fecha + hora (la cita con
  // datetime más temprano queda arriba). Comparamos como strings ISO
  // (YYYY-MM-DD HH:MM:SS) — funciona correctamente sin parsear a Date.
  const sortByLlegada = (a, b) => {
    const va = `${a.fecha ?? ''} ${a.hora ?? '00:00:00'}`;
    const vb = `${b.fecha ?? ''} ${b.hora ?? '00:00:00'}`;
    return va.localeCompare(vb);
  };

  const programadas = citas
    .filter(c => c.estado === 'programada' && matchSearch(c))
    .sort(sortByLlegada);

  const confirmadas = citas
    .filter(c => ['confirmada', 'en_curso'].includes(c.estado) && matchSearch(c))
    .filter(c => {
      if (!searchConfirmadas.trim()) return true;
      return (c.paciente_nombre ?? '').toLowerCase().includes(searchConfirmadas.toLowerCase());
    })
    .sort(sortByLlegada);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis citas"
        descripcion="Citas pendientes asignadas a ti"
        eyebrow="Citas"
        icon={<Calendar size={11} strokeWidth={2.25} />}
        variant="emerald"
      >
        <KPI label="Programadas" value={loading ? '···' : programadas.length} color="text-brand-700" />
        <KPI label="Confirmadas" value={loading ? '···' : confirmadas.length} color="text-emerald-700" />
      </PageHeader>

      <ErrorBanner msg={error} />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por paciente, documento o motivo…"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CuadroCitas
          titulo="Programadas"
          subtitulo="Asignadas por el administrador, aún sin confirmar"
          icono={ClipboardList}
          tono="brand"
          loading={loading}
          citas={programadas}
          vacioMsg="No hay citas programadas"
          renderAccion={() => (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-500 italic">
              <Hourglass size={11} strokeWidth={1.75} /> Esperando confirmación
            </span>
          )}
        />

        <CuadroCitas
          titulo="Confirmadas"
          subtitulo="El paciente ya llegó — ordenadas por primero en llegar"
          icono={CheckCircle2}
          tono="emerald"
          loading={loading}
          citas={confirmadas}
          vacioMsg={searchConfirmadas ? 'Ningún paciente coincide con la búsqueda' : 'No hay citas confirmadas'}
          toolbar={(
            <div className="px-4 py-2.5 border-b border-line/70 bg-surface/30">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink-300 pointer-events-none"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  value={searchConfirmadas}
                  onChange={(e) => setSearchConfirmadas(e.target.value)}
                  placeholder="Buscar paciente por nombre en confirmadas…"
                  className="w-full pl-9 pr-3 py-2 text-[12.5px] bg-white border border-line rounded-lg text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
            </div>
          )}
          renderAccion={(c) => (
            <button
              onClick={() => tomarCita(c)}
              title="Iniciar consulta médica para esta cita"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[12px] font-medium shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)] active:scale-[0.99] transition-all duration-150"
            >
              <Stethoscope size={13} strokeWidth={1.75} />
              {c.estado === 'en_curso' ? 'Continuar' : 'Tomar cita'}
            </button>
          )}
        />
      </div>
    </div>
  );
}

// ─── Cuadro de lista ──────────────────────────────────────────────────────────
function CuadroCitas({ titulo, subtitulo, icono: Icono, tono, loading, citas, vacioMsg, renderAccion, toolbar }) {
  const TONES = {
    brand:   { tint: 'bg-brand-50',   border: 'border-brand-100',   icon: 'text-brand-700' },
    emerald: { tint: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-700' },
  };
  const t = TONES[tono] ?? TONES.brand;

  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden flex flex-col">
      <header className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-flex w-9 h-9 items-center justify-center rounded-lg border ${t.tint} ${t.border} ${t.icon}`}>
            {Icono && <Icono size={16} strokeWidth={1.75} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{titulo}</h2>
            <p className="text-[11.5px] text-ink-500">{subtitulo}</p>
          </div>
        </div>
        <span className="text-[22px] font-semibold tabular-nums text-ink-900 leading-none">
          {loading ? '···' : citas.length}
        </span>
      </header>

      {toolbar}

      <div className="divide-y divide-line/70 flex-1">
        {loading ? (
          <LoadingState mensaje="Cargando…" />
        ) : citas.length === 0 ? (
          <EmptyState icon={Calendar} titulo={vacioMsg} />
        ) : (
          citas.map(c => (
            <div key={c.id_cita} className="p-4 hover:bg-surface/70 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar name={c.paciente_nombre} tone={tono} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink-900 truncate">{c.paciente_nombre ?? '—'}</p>
                    <p className="text-[11.5px] text-ink-500 font-mono">{c.paciente_documento ?? ''}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-ink-700">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={10} className={t.icon} strokeWidth={1.75} /> {c.fecha}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} strokeWidth={1.75} className="text-ink-500" /> {c.hora?.slice(0, 5)}
                      </span>
                      {c.tipo_consulta && (
                        <span className="text-ink-500 truncate">· {c.tipo_consulta}</span>
                      )}
                    </div>
                    {c.motivo && (
                      <p className="text-[11.5px] text-ink-700 mt-1 line-clamp-2" title={c.motivo}>
                        <span className="font-medium">Motivo:</span> {c.motivo}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <EstadoBadge type="cita" estado={c.estado} />
                  {renderAccion(c)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
