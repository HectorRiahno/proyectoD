import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook base para cargar un recurso async de un servicio.
 *
 * Encapsula el patrón repetido en las pages:
 *   - useState para data/loading/error
 *   - useEffect que llama al servicio
 *   - try/catch con manejo de error.message
 *   - mountedRef para no setState tras desmontaje
 *   - función `reload()` para refrescar después de mutaciones
 *
 * Uso:
 *   const { data, loading, error, reload } = useAsyncResource(
 *     () => pacienteService.getAll(),
 *     [],                              // deps
 *     { initialData: [] },             // opcional
 *   );
 *
 * @param {() => Promise<T>} fetcher Función que devuelve el recurso.
 * @param {Array} deps              Dependencias — refetch cuando cambien.
 * @param {object} opts
 * @param {*}     opts.initialData  Valor inicial de `data` (default: null).
 * @param {boolean} opts.skipInitial Si true, no carga al montar (solo en reload manual).
 */
export function useAsyncResource(fetcher, deps = [], opts = {}) {
  const { initialData = null, skipInitial = false } = opts;
  const [data, setData]       = useState(initialData);
  const [loading, setLoading] = useState(!skipInitial);
  const [error, setError]     = useState('');

  // Para evitar setState tras desmontaje y para descartar respuestas viejas
  // cuando se dispara una recarga antes de que termine la anterior.
  const mountedRef   = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async ({ silencioso = false } = {}) => {
    const myId = ++requestIdRef.current;
    if (!silencioso) setLoading(true);
    setError('');
    try {
      const result = await fetcher();
      if (!mountedRef.current || myId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (!mountedRef.current || myId !== requestIdRef.current) return;
      setError(err?.message ?? 'Error cargando datos');
    } finally {
      if (mountedRef.current && myId === requestIdRef.current && !silencioso) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (skipInitial) return;
    load();
  }, [load, skipInitial]);

  return { data, loading, error, reload: load, setData, setError };
}

/**
 * Variante: carga múltiples recursos en paralelo y devuelve un objeto.
 *
 *   const { data, loading, error, reload } = useParallelResources({
 *     pacientes: () => pacienteService.getCatalogo(),
 *     medicos:   () => medicoService.getCatalogoActivos(),
 *   });
 *
 *   data.pacientes // array
 *   data.medicos   // array
 */
export function useParallelResources(fetchers, deps = []) {
  const keys = Object.keys(fetchers);

  const fetcher = useCallback(async () => {
    const results = await Promise.all(keys.map(k => fetchers[k]()));
    return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useAsyncResource(fetcher, deps, { initialData: {} });
}

export default useAsyncResource;
