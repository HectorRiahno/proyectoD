// Fechas en hora local del navegador.
//
// `new Date().toISOString()` devuelve UTC: en Colombia (UTC-5), después
// de las 7 pm "hoy" pasaría a ser mañana. Usar estos helpers para todo
// lo que se compara con `fecha` / `hora` de las vistas de citas.

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' de la fecha local. */
export const fechaLocalISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' de hoy en hora local. */
export const hoyLocalISO = () => fechaLocalISO(new Date());

/** 'HH:MM' de la hora local actual. */
export const horaLocalHHMM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 'YYYY-MM-DD' → Date a medianoche local (evita el desfase de new Date('YYYY-MM-DD')). */
export const fechaDesdeISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** true si la fecha + hora ('YYYY-MM-DD', 'HH:MM[:SS]') ya llegó en hora local. */
export const yaLlegoLocal = (fecha, hora) =>
  !!fecha && `${fecha} ${(hora ?? '00:00').slice(0, 5)}` <= `${hoyLocalISO()} ${horaLocalHHMM()}`;

/** 'YYYY-MM-DD' + n días (n puede ser negativo). */
export const sumarDiasISO = (iso, n) => {
  const d = fechaDesdeISO(iso);
  d.setDate(d.getDate() + n);
  return fechaLocalISO(d);
};
