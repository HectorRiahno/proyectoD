import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Dictado por voz (reconocimiento de voz del navegador) ────────────────────
// Disponible en Chrome, Edge y Safari (escritorio y móvil). En navegadores sin
// soporte (Firefox) `soportado` es false y el botón no se muestra: el campo
// sigue funcionando escribiendo.
//
// Sólo un campo dicta a la vez: al empezar en otro, el anterior se detiene.
//
// Comandos de voz (palabras que no aparecen en texto clínico normal):
//   "punto y aparte" / "nueva línea" → salto de línea
//   "punto seguido"                  → punto
const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

let detenerActivo = null;   // detiene el dictado en curso (de cualquier campo)

const MENSAJES_ERROR = {
  'not-allowed':         'Permite el uso del micrófono en el navegador para dictar.',
  'service-not-allowed': 'Permite el uso del micrófono en el navegador para dictar.',
  'audio-capture':       'No se encontró un micrófono conectado.',
  'network':             'Sin conexión con el servicio de dictado. Revisa tu internet.',
  'language-not-supported': 'El dictado en español no está disponible en este navegador.',
};

export function aplicarComandos(texto) {
  return texto
    .replace(/\s*\b(punto y aparte|nueva l[ií]nea)\b\s*/gi, '\n')
    .replace(/\s*\bpunto seguido\b/gi, '.')
    // Mayúscula al empezar una frase nueva dentro de lo dictado
    .replace(/([.!?]\s+|\n)(\p{Ll})/gu, (_, sep, letra) => sep + letra.toUpperCase());
}

// Une el texto dictado al existente: espacio intermedio y mayúscula inicial
// al comienzo del campo o después de punto / salto de línea.
export function unirDictado(actual, dictado) {
  let nuevo = aplicarComandos(dictado.trim());
  if (!nuevo) return actual;
  const base = actual ?? '';
  const inicioFrase = base.trim() === '' || /[.!?]\s*$|\n\s*$/.test(base);
  if (inicioFrase) nuevo = nuevo.charAt(0).toUpperCase() + nuevo.slice(1);
  const separador = base === '' || /\s$/.test(base) || nuevo.startsWith('\n') ? '' : ' ';
  return base + separador + nuevo;
}

/**
 * @param {(texto: string) => void} onTexto  recibe cada frase reconocida (final)
 */
export function useDictado(onTexto) {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial]       = useState('');
  const [error, setError]           = useState('');
  const recRef      = useRef(null);
  const activoRef   = useRef(false);   // el usuario quiere seguir dictando
  const onTextoRef  = useRef(onTexto);
  onTextoRef.current = onTexto;

  const detener = useCallback(() => {
    activoRef.current = false;
    setEscuchando(false);
    setParcial('');
    try { recRef.current?.stop(); } catch { /* ya detenido */ }
    if (detenerActivo === detener) detenerActivo = null;
  }, []);

  const iniciar = useCallback(() => {
    if (!SR) return;
    if (detenerActivo && detenerActivo !== detener) detenerActivo();
    detenerActivo = detener;

    const rec = new SR();
    rec.lang = 'es-CO';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interino = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onTextoRef.current?.(r[0].transcript);
        else interino += r[0].transcript;
      }
      setParcial(interino);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;   // silencio: se reanuda solo
      setError(MENSAJES_ERROR[e.error] ?? 'No se pudo usar el dictado.');
      activoRef.current = false;
    };
    // El navegador corta tras un silencio largo: si el médico no pidió
    // detener, se reanuda sin que tenga que volver a pulsar.
    rec.onend = () => {
      if (activoRef.current) {
        try { rec.start(); return; } catch { /* no se pudo reanudar */ }
      }
      setEscuchando(false);
      setParcial('');
    };

    recRef.current = rec;
    activoRef.current = true;
    setError('');
    try {
      rec.start();
      setEscuchando(true);
    } catch {
      setError('No se pudo iniciar el dictado.');
      activoRef.current = false;
    }
  }, [detener]);

  const alternar = useCallback(() => {
    if (activoRef.current) detener(); else iniciar();
  }, [detener, iniciar]);

  // Al salir de la pestaña o de la página, apagar el micrófono.
  useEffect(() => () => {
    activoRef.current = false;
    try { recRef.current?.abort(); } catch { /* nada */ }
    if (detenerActivo) detenerActivo = null;
  }, []);

  return { soportado: !!SR, escuchando, parcial, error, alternar, detener };
}
