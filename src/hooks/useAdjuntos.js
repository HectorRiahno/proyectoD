import { useCallback } from 'react';
import { adjuntoService } from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Lista los adjuntos de una consulta + helpers para subir/eliminar.
 *
 *   const { adjuntos, loading, error, subir, eliminar, reload } = useAdjuntos(idConsulta);
 *
 * `subir(file, descripcion)` puede llamarse N veces; cada subida recarga la lista.
 */
export function useAdjuntos(idConsulta) {
  const res = useAsyncResource(
    () => idConsulta ? adjuntoService.listarPorConsulta(idConsulta) : Promise.resolve([]),
    [idConsulta],
    { initialData: [] },
  );

  const subir = useCallback(async (file, descripcion) => {
    const a = await adjuntoService.subir(file, idConsulta, descripcion);
    await res.reload({ silencioso: true });
    return a;
  }, [idConsulta, res]);

  const eliminar = useCallback(async (adjunto) => {
    await adjuntoService.eliminar(adjunto);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, adjuntos: res.data, subir, eliminar };
}

/**
 * Adjuntos de TODAS las consultas de un paciente — vista médica.
 * Usado en el panel "Adjuntos previos" de AtenderCita y en el modal de
 * historial de MisPacientes.
 */
export function useAdjuntosPacienteMedico(idPaciente) {
  const res = useAsyncResource(
    () => idPaciente ? adjuntoService.listarPorPacienteMedico(idPaciente) : Promise.resolve([]),
    [idPaciente],
    { initialData: [] },
  );
  return { ...res, adjuntos: res.data };
}

/** Adjuntos del paciente autenticado — vista cliente. */
export function useMisAdjuntos() {
  const res = useAsyncResource(
    () => adjuntoService.listarMios(),
    [],
    { initialData: [] },
  );
  return { ...res, adjuntos: res.data };
}
