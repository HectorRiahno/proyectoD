import { useCallback } from 'react';
import {
  pacienteService, medicoService, usuarioService,
} from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Lista completa de pacientes (vw_admin_pacientes) — para la página admin.
 * Devuelve {data, loading, error, reload}. Operaciones de escritura
 * disponibles como métodos en el objeto retornado.
 */
export function usePacientes() {
  const res = useAsyncResource(
    () => pacienteService.getAll(),
    [],
    { initialData: [] },
  );

  const softDelete = useCallback(async (id) => {
    await pacienteService.softDelete(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, pacientes: res.data, softDelete };
}

/** Pacientes atendidos por el médico autenticado (vw_medico_mis_pacientes). */
export function useMisPacientesMedico() {
  const res = useAsyncResource(
    () => medicoService.getMisPacientes(),
    [],
    { initialData: [] },
  );
  return { ...res, pacientes: res.data };
}

/** Catálogo simple para selects (id + nombre + documento). */
export function usePacientesCatalogo() {
  const res = useAsyncResource(
    () => pacienteService.getCatalogo(),
    [],
    { initialData: [] },
  );
  return { ...res, pacientes: res.data };
}

/**
 * Lista de médicos — para la página admin de Médicos.
 */
export function useMedicos() {
  const res = useAsyncResource(
    () => medicoService.getAll(),
    [],
    { initialData: [] },
  );

  const toggleActivo = useCallback(async (m) => {
    await medicoService.setActivo(m.id_medico, !m.activo);
    await res.reload({ silencioso: true });
  }, [res]);

  const eliminar = useCallback(async (id) => {
    await medicoService.eliminar(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, medicos: res.data, toggleActivo, eliminar };
}

/** Médicos activos (para selects en formulario de cita). */
export function useMedicosActivos() {
  const res = useAsyncResource(
    () => medicoService.getCatalogoActivos(),
    [],
    { initialData: [] },
  );
  return { ...res, medicos: res.data };
}

/**
 * Lista de usuarios + helpers de mutación.
 */
export function useUsuarios() {
  const res = useAsyncResource(
    () => usuarioService.getAll(),
    [],
    { initialData: [] },
  );

  const toggleActivo = useCallback(async (u) => {
    await usuarioService.setActivo(u.id_usuario, !u.activo);
    await res.reload({ silencioso: true });
  }, [res]);

  const eliminar = useCallback(async (id) => {
    await usuarioService.eliminar(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, usuarios: res.data, toggleActivo, eliminar };
}
