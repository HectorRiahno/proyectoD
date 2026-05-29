import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, AlertCircle, Loader2,
  Clock, Calendar, ToggleLeft, ToggleRight,
  Stethoscope, CalendarDays,
} from 'lucide-react';
import { horarioService } from '../../../services';
import { useHorarios } from '../../../hooks';
import {
  Modal, PageHeader, KPI, ErrorBanner, BotonesForm,
  SearchBar, AccentButton, EmptyState, IconButton, ActionGroup, Avatar,
} from '../../../shared/components/ui';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const DIA_COLOR = {
  Lunes:      'bg-brand-50 text-brand-700 border-brand-100',
  Martes:     'bg-indigo-50 text-indigo-700 border-indigo-100',
  Miércoles:  'bg-violet-50 text-violet-700 border-violet-100',
  Jueves:     'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  Viernes:    'bg-amber-50 text-amber-700 border-amber-100',
  Sábado:     'bg-teal-50 text-teal-700 border-teal-100',
  Domingo:    'bg-rose-50 text-rose-700 border-rose-100',
};

const fmtTime = (t) => t ? t.slice(0, 5) : '—';

function calcDuracion(inicio, fin) {
  if (!inicio || !fin) return null;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return mins > 0 ? mins : null;
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Horarios() {
  const {
    medicos, horarios, loading, error, setError,
    reload: cargar, toggleDisponible: toggleHook, eliminar: eliminarHook,
  } = useHorarios();
  const [search, setSearch]       = useState('');
  const [medicoSelId, setMedicoSelId] = useState(null);
  const [editando, setEditando]   = useState(null);
  const [creando, setCreando]     = useState(false);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') cargar();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [cargar]);

  const medicoSel = medicos.find(m => m.id_medico === medicoSelId) ?? null;

  const medicosFiltered = medicos.filter(m => {
    const term = search.toLowerCase();
    return (
      (m.nombre_completo ?? '').toLowerCase().includes(term) ||
      (m.especialidad ?? '').toLowerCase().includes(term)
    );
  });

  const countHorarios = (id) => horarios.filter(h => h.id_medico === id).length;

  const horariosDelMedico = medicoSelId
    ? horarios.filter(h => h.id_medico === medicoSelId)
    : [];

  const horariosPorDia = DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = horariosDelMedico.filter(h => h.dia_semana === dia);
    return acc;
  }, {});

  const medicosConHorario = medicos.filter(m => countHorarios(m.id_medico) > 0).length;

  const toggleDisponible = async (h) => {
    try { await toggleHook(h); }
    catch (err) { setError(err.message); }
  };

  const eliminar = async (h) => {
    if (!window.confirm(
      `¿Eliminar la franja del ${h.dia_semana} de ${fmtTime(h.hora_inicio)} a ${fmtTime(h.hora_fin)}?`
    )) return;
    try { await eliminarHook(h.id_horario); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Horarios médicos"
        descripcion="Asigna y gestiona las franjas horarias del personal médico"
        eyebrow="Horarios"
        icon={<Clock size={11} strokeWidth={2.25} />}
        variant="teal"
      >
        <KPI label="Total médicos"       value={loading ? '···' : medicos.length} />
        <KPI label="Con horario"         value={loading ? '···' : medicosConHorario} color="text-teal-700" />
        <KPI label="Franjas registradas" value={loading ? '···' : horarios.length} />
      </PageHeader>

      <ErrorBanner msg={error} onRetry={cargar} />

      {/* Layout de dos columnas */}
      <div className="flex gap-6 items-start">
        {/* ── Panel izquierdo: lista de médicos ── */}
        <div className="w-80 flex-shrink-0 space-y-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar médico…"
          />

          <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-surface">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
                Médicos ({medicosFiltered.length})
              </p>
            </div>

            <div className="divide-y divide-line/70 max-h-[calc(100vh-24rem)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-teal-600" strokeWidth={1.75} />
                </div>
              ) : medicosFiltered.length === 0 ? (
                <div className="text-center py-10 text-[13px] text-ink-500">
                  <Stethoscope size={24} className="mx-auto mb-2 text-ink-300" strokeWidth={1.75} />
                  Sin resultados
                </div>
              ) : (
                medicosFiltered.map(m => {
                  const cnt    = countHorarios(m.id_medico);
                  const activo = medicoSelId === m.id_medico;
                  return (
                    <button
                      key={m.id_medico}
                      onClick={() => setMedicoSelId(m.id_medico)}
                      className={[
                        'w-full text-left px-4 py-3 transition-colors flex items-center gap-3',
                        activo
                          ? 'bg-teal-600 text-white'
                          : 'hover:bg-surface',
                      ].join(' ')}
                    >
                      <Avatar name={m.nombre_completo} tone={activo ? 'ink' : 'teal'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-medium truncate ${activo ? 'text-white' : 'text-ink-900'}`}>
                          {m.nombre_completo}
                        </p>
                        <p className={`text-[11.5px] truncate ${activo ? 'text-white/70' : 'text-ink-500'}`}>
                          {m.especialidad ?? 'Sin especialidad'}
                        </p>
                      </div>
                      <span className={[
                        'text-[11px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 tabular-nums',
                        activo
                          ? 'bg-white/20 text-white'
                          : cnt > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-surface text-ink-500 border border-line',
                      ].join(' ')}>
                        {cnt}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Panel derecho: horarios del médico seleccionado ── */}
        <div className="flex-1 min-w-0">
          {!medicoSel ? (
            <EmptyState
              icon={CalendarDays}
              titulo="Selecciona un médico"
              descripcion="Elige un médico de la lista para ver y gestionar su horario."
            />
          ) : (
            <div className="space-y-4">
              {/* Cabecera del médico seleccionado */}
              <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar name={medicoSel.nombre_completo} tone="teal" size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-[18px] font-semibold tracking-tight text-ink-900 truncate">
                        Dr(a). {medicoSel.nombre_completo}
                      </h2>
                      <p className="text-[13px] font-medium text-violet-700 truncate">{medicoSel.especialidad ?? 'Sin especialidad'}</p>
                      <p className="text-[11.5px] text-ink-500 mt-0.5">
                        {horariosDelMedico.length}{' '}
                        {horariosDelMedico.length === 1 ? 'franja registrada' : 'franjas registradas'}
                      </p>
                    </div>
                  </div>
                  <AccentButton variant="teal" icon={Plus} onClick={() => setCreando(true)}>
                    Agregar franja
                  </AccentButton>
                </div>
              </div>

              {/* Sin franjas */}
              {horariosDelMedico.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  titulo="Sin franjas horarias"
                  descripcion="Agrega el horario de trabajo del médico."
                />
              ) : (
                /* Tablas por día */
                <div className="space-y-3">
                  {DIAS_SEMANA.map(dia => {
                    const slots = horariosPorDia[dia];
                    if (slots.length === 0) return null;
                    return (
                      <div key={dia} className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
                        <div className={`px-5 py-2.5 border-b flex items-center gap-2 ${DIA_COLOR[dia]}`}>
                          <Calendar size={13} strokeWidth={1.75} />
                          <span className="text-[12.5px] font-semibold tracking-tight">{dia}</span>
                          <span className="ml-auto text-[11px] font-medium opacity-70">
                            {slots.length} {slots.length === 1 ? 'franja' : 'franjas'}
                          </span>
                        </div>
                        <table className="w-full">
                          <thead className="bg-surface border-b border-line">
                            <tr>
                              <th className="px-5 py-2.5 text-left text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.10em]">Hora inicio</th>
                              <th className="px-5 py-2.5 text-left text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.10em]">Hora fin</th>
                              <th className="px-5 py-2.5 text-left text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.10em]">Duración</th>
                              <th className="px-5 py-2.5 text-center text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.10em]">Disponible</th>
                              <th className="px-5 py-2.5 text-center text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.10em]">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/70">
                            {slots.map((h) => {
                              const dur = calcDuracion(h.hora_inicio, h.hora_fin);
                              return (
                                <tr key={h.id_horario} className="hover:bg-surface/70 transition-colors">
                                  <td className="px-5 py-3">
                                    <span className="font-mono text-[13px] font-medium text-ink-900">{fmtTime(h.hora_inicio)}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="font-mono text-[13px] font-medium text-ink-900">{fmtTime(h.hora_fin)}</span>
                                  </td>
                                  <td className="px-5 py-3 text-[12.5px] text-ink-700">
                                    {dur !== null ? `${dur} min` : '—'}
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <button onClick={() => toggleDisponible(h)} className="mx-auto block" title={h.disponible ? 'Deshabilitar' : 'Habilitar'}>
                                      {h.disponible
                                        ? <ToggleRight size={22} className="text-emerald-500" strokeWidth={1.75} />
                                        : <ToggleLeft  size={22} className="text-ink-300" strokeWidth={1.75} />}
                                    </button>
                                    <p className="text-[11px] text-ink-500 mt-0.5">{h.disponible ? 'Sí' : 'No'}</p>
                                  </td>
                                  <td className="px-5 py-3">
                                    <ActionGroup>
                                      <IconButton icon={Edit}   tone="indigo" title="Editar"   onClick={() => setEditando(h)} />
                                      <IconButton icon={Trash2} tone="red"    title="Eliminar" onClick={() => eliminar(h)}    />
                                    </ActionGroup>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {creando && medicoSel && (
        <ModalHorario
          idMedico={medicoSel.id_medico}
          onClose={() => { setCreando(false); cargar(); }}
        />
      )}
      {editando && medicoSel && (
        <ModalHorario
          horario={editando}
          idMedico={medicoSel.id_medico}
          onClose={() => { setEditando(null); cargar(); }}
        />
      )}
    </div>
  );
}

// ─── Modal: crear / editar franja ─────────────────────────────────────────────
function ModalHorario({ horario, idMedico, onClose }) {
  const esEdicion = !!horario;
  const [form, setForm] = useState({
    dia_semana:  horario?.dia_semana                    ?? 'Lunes',
    hora_inicio: (horario?.hora_inicio ?? '08:00').slice(0, 5),
    hora_fin:    (horario?.hora_fin    ?? '12:00').slice(0, 5),
    disponible:  horario?.disponible ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.hora_fin <= form.hora_inicio) {
      return setError('La hora de fin debe ser mayor que la hora de inicio.');
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        id_medico:   idMedico,
        dia_semana:  form.dia_semana,
        hora_inicio: form.hora_inicio,
        hora_fin:    form.hora_fin,
        disponible:  form.disponible,
      };
      if (esEdicion) await horarioService.actualizar(horario.id_horario, payload);
      else           await horarioService.crear(payload);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const durPreview = calcDuracion(form.hora_inicio, form.hora_fin);

  return (
    <Modal
      titulo={esEdicion ? 'Editar franja horaria' : 'Nueva franja horaria'}
      variant="teal"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de día */}
        <div>
          <label className="text-[13px] font-medium text-ink-700 mb-2.5 block">Día de la semana *</label>
          <div className="grid grid-cols-4 gap-2">
            {DIAS_SEMANA.map(dia => (
              <button
                key={dia}
                type="button"
                onClick={() => setForm(p => ({ ...p, dia_semana: dia }))}
                className={`py-2 px-2 rounded-xl text-[12.5px] font-medium transition-all duration-150 border ${
                  form.dia_semana === dia
                    ? 'bg-teal-600 text-white border-teal-600 shadow-[0_4px_14px_-6px_rgba(11,18,32,0.35)]'
                    : 'bg-white border-line text-ink-700 hover:border-teal-300 hover:text-teal-700'
                }`}
              >
                {dia.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-ink-500 mt-2">
            Seleccionado: <strong className="font-medium text-teal-700">{form.dia_semana}</strong>
          </p>
        </div>

        {/* Horas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Hora de inicio *</label>
            <input
              type="time"
              name="hora_inicio"
              value={form.hora_inicio}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 text-[13.5px] font-mono bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Hora de fin *</label>
            <input
              type="time"
              name="hora_fin"
              value={form.hora_fin}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 text-[13.5px] font-mono bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
          </div>
        </div>

        {/* Disponible */}
        <label htmlFor="chk-disponible" className="flex items-center gap-3 p-3 bg-surface border border-line rounded-xl cursor-pointer hover:border-ink-100 transition-colors">
          <input
            type="checkbox"
            name="disponible"
            id="chk-disponible"
            checked={form.disponible}
            onChange={handleChange}
            className="w-4 h-4 rounded text-teal-600 accent-teal-600"
          />
          <span className="text-[13.5px] font-medium text-ink-800">
            Franja disponible para citas
          </span>
        </label>

        {/* Vista previa */}
        {durPreview !== null && (
          <div className="flex items-start gap-2.5 text-[13px] text-teal-800 bg-teal-50/70 border-l-2 border-teal-500 pl-3 pr-3 py-2.5 rounded-r-md">
            <Clock size={14} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong className="font-medium">{form.dia_semana}:</strong> {form.hora_inicio} – {form.hora_fin} · {durPreview} minutos
            </span>
          </div>
        )}

        {error && <LocalErrorBox msg={error} />}
        <BotonesForm
          onCancel={onClose}
          saving={saving}
          labelSave={esEdicion ? 'Guardar cambios' : 'Agregar franja'}
        />
      </form>
    </Modal>
  );
}

function LocalErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2.5 rounded-r-md">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} /> {msg}
    </div>
  );
}
