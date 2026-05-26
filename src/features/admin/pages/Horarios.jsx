import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Edit, Trash2, AlertCircle, Loader2,
  Clock, Calendar, ToggleLeft, ToggleRight, X,
  Stethoscope, CalendarDays, RefreshCw,
} from 'lucide-react';
import { horarioService } from '../../../services';
import { useHorarios } from '../../../hooks';
import { Modal, PageHeader, KPI, ErrorBanner, BotonesForm } from '../../../shared/components/ui';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const DIA_COLOR = {
  Lunes:      'bg-blue-100 text-blue-700 border-blue-200',
  Martes:     'bg-indigo-100 text-indigo-700 border-indigo-200',
  Miércoles:  'bg-purple-100 text-purple-700 border-purple-200',
  Jueves:     'bg-pink-100 text-pink-700 border-pink-200',
  Viernes:    'bg-orange-100 text-orange-700 border-orange-200',
  Sábado:     'bg-teal-100 text-teal-700 border-teal-200',
  Domingo:    'bg-red-100 text-red-700 border-red-200',
};

const initials = (n) =>
  (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

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

  // Refrescar cuando la pestaña vuelve a estar visible — esto evita que
  // queden datos viejos o un estado "cargando" eterno tras inactividad.
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
        titulo="Horarios Médicos"
        descripcion="Asigna y gestiona las franjas horarias del personal médico"
        variant="emerald"
      >
        <KPI label="Total médicos"       value={loading ? '···' : medicos.length} />
        <KPI label="Con horario"         value={loading ? '···' : medicosConHorario} />
        <KPI label="Franjas registradas" value={loading ? '···' : horarios.length} />
      </PageHeader>

      <ErrorBanner msg={error} onRetry={cargar} />

      {/* Layout de dos columnas */}
      <div className="flex gap-6 items-start">
        {/* ── Panel izquierdo: lista de médicos ── */}
        <div className="w-80 flex-shrink-0 space-y-3">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar médico..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-3">
              <p className="text-xs font-bold text-gray-700 uppercase">
                Médicos ({medicosFiltered.length})
              </p>
            </div>

            <div className="divide-y divide-gray-100 max-h-[calc(100vh-24rem)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                </div>
              ) : medicosFiltered.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <Stethoscope size={32} className="mx-auto mb-2 text-gray-300" />
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
                      className={`w-full text-left px-4 py-3 transition flex items-center gap-3 ${
                        activo
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                          : 'hover:bg-emerald-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${
                        activo
                          ? 'bg-white/20 text-white'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                      }`}>
                        {initials(m.nombre_completo)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${activo ? 'text-white' : 'text-gray-900'}`}>
                          {m.nombre_completo}
                        </p>
                        <p className={`text-xs truncate ${activo ? 'text-emerald-100' : 'text-gray-500'}`}>
                          {m.especialidad ?? 'Sin especialidad'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                        activo
                          ? 'bg-white/20 text-white'
                          : cnt > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
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
            <div className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              <CalendarDays size={64} className="text-gray-200 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 mb-1">Selecciona un médico</h3>
              <p className="text-sm text-gray-400">Elige un médico de la lista para ver y gestionar su horario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cabecera del médico seleccionado */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                      {initials(medicoSel.nombre_completo)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Dr(a). {medicoSel.nombre_completo}</h2>
                      <p className="text-purple-600 text-sm font-medium">{medicoSel.especialidad ?? 'Sin especialidad'}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {horariosDelMedico.length}{' '}
                        {horariosDelMedico.length === 1 ? 'franja registrada' : 'franjas registradas'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreando(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-lg text-sm"
                  >
                    <Plus size={18} /> Agregar franja
                  </button>
                </div>
              </div>

              {/* Sin franjas */}
              {horariosDelMedico.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center py-16 text-center">
                  <Clock size={48} className="text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">Sin franjas horarias</p>
                  <p className="text-sm text-gray-400 mt-1">Agrega el horario de trabajo del médico</p>
                </div>
              ) : (
                /* Tablas por día */
                <div className="space-y-3">
                  {DIAS_SEMANA.map(dia => {
                    const slots = horariosPorDia[dia];
                    if (slots.length === 0) return null;
                    return (
                      <div key={dia} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                        <div className={`px-5 py-3 border-b flex items-center gap-2 ${DIA_COLOR[dia]}`}>
                          <Calendar size={15} />
                          <span className="font-bold text-sm">{dia}</span>
                          <span className="ml-auto text-xs font-medium opacity-70">
                            {slots.length} {slots.length === 1 ? 'franja' : 'franjas'}
                          </span>
                        </div>
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">Hora inicio</th>
                              <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">Hora fin</th>
                              <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">Duración</th>
                              <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 uppercase">Disponible</th>
                              <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 uppercase">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {slots.map((h, idx) => {
                              const dur = calcDuracion(h.hora_inicio, h.hora_fin);
                              return (
                                <tr key={h.id_horario} className={`hover:bg-emerald-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <td className="px-5 py-3">
                                    <span className="font-mono font-semibold text-gray-900">{fmtTime(h.hora_inicio)}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="font-mono font-semibold text-gray-900">{fmtTime(h.hora_fin)}</span>
                                  </td>
                                  <td className="px-5 py-3 text-sm text-gray-600">
                                    {dur !== null ? `${dur} min` : '—'}
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <button onClick={() => toggleDisponible(h)} className="mx-auto block" title={h.disponible ? 'Deshabilitar' : 'Habilitar'}>
                                      {h.disponible
                                        ? <ToggleRight size={26} className="text-green-500" />
                                        : <ToggleLeft  size={26} className="text-gray-400" />}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-0.5">{h.disponible ? 'Sí' : 'No'}</p>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => setEditando(h)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        title="Editar"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => eliminar(h)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Eliminar"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
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
    <Modal titulo={esEdicion ? 'Editar franja horaria' : 'Nueva franja horaria'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de día */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">Día de la semana *</label>
          <div className="grid grid-cols-4 gap-2">
            {DIAS_SEMANA.map(dia => (
              <button
                key={dia}
                type="button"
                onClick={() => setForm(p => ({ ...p, dia_semana: dia }))}
                className={`py-2 px-2 rounded-xl text-sm font-medium transition border ${
                  form.dia_semana === dia
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md'
                    : 'border-gray-300 text-gray-700 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >
                {dia.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Seleccionado: <strong className="text-emerald-600">{form.dia_semana}</strong>
          </p>
        </div>

        {/* Horas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Hora de inicio *</label>
            <input
              type="time"
              name="hora_inicio"
              value={form.hora_inicio}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Hora de fin *</label>
            <input
              type="time"
              name="hora_fin"
              value={form.hora_fin}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Disponible */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            type="checkbox"
            name="disponible"
            id="chk-disponible"
            checked={form.disponible}
            onChange={handleChange}
            className="w-5 h-5 rounded text-emerald-600"
          />
          <label htmlFor="chk-disponible" className="text-sm font-medium text-gray-700">
            Franja disponible para citas
          </label>
        </div>

        {/* Vista previa */}
        {durPreview !== null && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
            <p className="font-semibold flex items-center gap-2">
              <Clock size={14} />
              {form.dia_semana}: {form.hora_inicio} – {form.hora_fin} · {durPreview} minutos
            </p>
          </div>
        )}

        {error && <ErrorBox msg={error} />}
        <BotonesForm
          onCancel={onClose}
          saving={saving}
          labelSave={esEdicion ? 'Guardar cambios' : 'Agregar franja'}
        />
      </form>
    </Modal>
  );
}

// ─── Local: ErrorBox inline (mantener — el global es similar, no vale la pena cambiar) ─────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
      <AlertCircle size={16} className="flex-shrink-0" /> {msg}
    </div>
  );
}
