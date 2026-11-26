import React, { useState, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

/* =====================================================================
   ComboBuscador — input con lista desplegable que filtra mientras se
   escribe (nombre, documento, especialidad…). Reemplaza el par
   "input de filtro + <select>", donde el filtro no se notaba porque el
   select cerrado sólo muestra lo seleccionado.

     <ComboBuscador
       opciones={[{ value: 1, label: 'Ana Ruiz', detalle: 'CC 123' }]}
       value={id} onChange={setId} placeholder="Buscar paciente…" />
   ===================================================================== */

const MAX_RESULTADOS = 8;
const normalizar = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function ComboBuscador({
  opciones, value, onChange, placeholder = 'Buscar…', vacio = 'Sin resultados', disabled = false,
}) {
  const [texto, setTexto]     = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo]   = useState(0);
  const inputRef = useRef(null);

  const seleccionada = opciones.find(o => String(o.value) === String(value)) ?? null;
  const term = normalizar(texto);
  const filtradas = opciones
    .filter(o => !term || normalizar(`${o.label} ${o.detalle ?? ''}`).includes(term))
    .slice(0, MAX_RESULTADOS);

  const elegir = (o) => {
    onChange(o.value);
    setTexto('');
    setAbierto(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setActivo(i => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault();
      if (filtradas[activo]) elegir(filtradas[activo]);
    } else if (e.key === 'Escape' && abierto) {
      // Que ESC cierre sólo la lista, no el modal que contiene el combo.
      e.stopPropagation();
      setAbierto(false);
    }
  };

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink-300 pointer-events-none" strokeWidth={1.75} />
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={abierto ? texto : (seleccionada?.label ?? '')}
        placeholder={seleccionada ? seleccionada.label : placeholder}
        onFocus={() => { setAbierto(true); setActivo(0); }}
        onBlur={() => setAbierto(false)}
        onChange={e => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
        onKeyDown={onKeyDown}
        className="w-full pl-9 pr-9 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all disabled:bg-surface"
      />
      {seleccionada && !disabled && (
        <button
          type="button"
          title="Quitar selección"
          onMouseDown={e => e.preventDefault()}
          onClick={() => { onChange(''); setTexto(''); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-300 hover:text-ink-700 hover:bg-surface"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
      {seleccionada?.detalle && !abierto && (
        <p className="text-[11.5px] text-ink-500 mt-1.5">{seleccionada.detalle}</p>
      )}

      {abierto && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-line rounded-xl shadow-[0_12px_32px_-12px_rgba(11,18,32,0.25)] py-1"
        >
          {filtradas.length === 0 ? (
            <li className="px-3.5 py-2.5 text-[12.5px] text-ink-500">{vacio}</li>
          ) : filtradas.map((o, i) => {
            const esSel = String(o.value) === String(value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={esSel}
                // onMouseDown para elegir antes de que el blur cierre la lista
                onMouseDown={e => { e.preventDefault(); elegir(o); }}
                onMouseEnter={() => setActivo(i)}
                className={`px-3.5 py-2 cursor-pointer flex items-center justify-between gap-2 ${i === activo ? 'bg-brand-50' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] text-ink-900 truncate">{o.label}</span>
                  {o.detalle && <span className="block text-[11.5px] text-ink-500 truncate">{o.detalle}</span>}
                </span>
                {esSel && <Check size={14} className="text-brand-600 flex-shrink-0" strokeWidth={2} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
