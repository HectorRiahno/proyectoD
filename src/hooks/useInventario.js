import { useCallback } from 'react';
import { inventarioService, horarioService, medicoService } from '../services';
import { useParallelResources } from './useAsyncResource';

/**
 * Catálogo de medicamentos + categorías para la página Inventario.
 */
export function useInventario() {
  const res = useParallelResources({
    medicamentos: () => inventarioService.getMedicamentos(),
    categorias:   () => inventarioService.getCategorias(),
  }, []);

  const eliminar = useCallback(async (id) => {
    await inventarioService.eliminar(id);
    await res.reload({ silencioso: true });
  }, [res]);

  const guardar = useCallback(async (selected, formData) => {
    if (selected) await inventarioService.actualizar(selected.id_medicamento, formData);
    else          await inventarioService.crear(formData);
    await res.reload({ silencioso: true });
  }, [res]);

  return {
    ...res,
    medicamentos: res.data?.medicamentos ?? [],
    categorias:   res.data?.categorias ?? [],
    eliminar, guardar,
  };
}

/**
 * Médicos + sus horarios (página Horarios admin).
 */
export function useHorarios() {
  const res = useParallelResources({
    medicos:  () => medicoService.getAll(),
    horarios: () => horarioService.getAll(),
  }, []);

  const toggleDisponible = useCallback(async (h) => {
    await horarioService.toggleDisponible(h.id_horario, !h.disponible);
    await res.reload({ silencioso: true });
  }, [res]);

  const eliminar = useCallback(async (id) => {
    await horarioService.eliminar(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return {
    ...res,
    medicos:  res.data?.medicos ?? [],
    horarios: res.data?.horarios ?? [],
    toggleDisponible, eliminar,
  };
}
