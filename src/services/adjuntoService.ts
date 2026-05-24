import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Adjuntos a consultas médicas. El binario vive en Supabase Storage
// (bucket "consulta-adjuntos") y los metadatos en la tabla consulta_adjunto.
const BUCKET = 'consulta-adjuntos';
const TABLE  = 'consulta_adjunto';

export const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];

export const TAMANIO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface Adjunto {
  id_adjunto: number;
  id_consulta: number;
  nombre_archivo: string;
  storage_path: string;
  tipo_mime: string;
  tamanio_bytes: number;
  descripcion?: string | null;
  subido_por?: string | null;
  fecha_subida: string;
  // De vistas:
  fecha_consulta?: string;
  motivo_consulta?: string | null;
  impresion_diagnostica?: string | null;
  medico_nombre?: string | null;
  medico_especialidad?: string | null;
  id_paciente?: number;
}

/**
 * Valida un archivo antes de intentar subirlo. Lanza ServiceError si no pasa.
 */
export function validarArchivo(file: File): void {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new ServiceError(
      `Tipo de archivo no permitido (${file.type}). Solo PDF e imágenes (JPEG/PNG/WebP/GIF).`,
    );
  }
  if (file.size > TAMANIO_MAX_BYTES) {
    throw new ServiceError(
      `El archivo excede el tamaño máximo de ${(TAMANIO_MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
}

/**
 * Construye un path único dentro del bucket para una consulta.
 * Formato: "{id_consulta}/{timestamp}-{nombre-sanitizado}".
 */
function buildStoragePath(idConsulta: number | string, fileName: string): string {
  const sanitized = fileName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quitar acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_')   // dejar solo seguro para URLs
    .slice(0, 100);
  return `${idConsulta}/${Date.now()}-${sanitized}`;
}

export const adjuntoService = {
  /** Tipos permitidos como string para el atributo accept de un <input type="file">. */
  acceptString: TIPOS_PERMITIDOS.join(','),

  validarArchivo,

  /**
   * Sube un archivo al bucket y crea la fila de metadatos. Devuelve el adjunto.
   */
  async subir(file: File, idConsulta: number | string, descripcion?: string): Promise<Adjunto> {
    validarArchivo(file);
    const path = buildStoragePath(idConsulta, file.name);

    // 1. Storage
    const up = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (up.error) {
      throw new ServiceError(`No se pudo subir el archivo: ${up.error.message}`);
    }

    // 2. Metadatos
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        id_consulta:    Number(idConsulta),
        nombre_archivo: file.name,
        storage_path:   path,
        tipo_mime:      file.type,
        tamanio_bytes:  file.size,
        descripcion:    descripcion?.trim() || null,
        subido_por:     authData?.user?.id ?? null,
      })
      .select('*')
      .single();

    if (error) {
      // Rollback de storage si falló la metadata
      await supabase.storage.from(BUCKET).remove([path]);
      if (error.code === '42501') {
        throw new ServiceError(
          'Sin permisos para registrar el adjunto. Asegúrate de que la consulta es tuya.',
          error.code,
        );
      }
      throw new ServiceError(error.message, error.code);
    }
    return data as Adjunto;
  },

  /** Lista adjuntos de una consulta específica (vista médica). */
  async listarPorConsulta(idConsulta: number | string): Promise<Adjunto[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id_consulta', idConsulta)
      .is('deleted_at', null)
      .order('fecha_subida', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Adjunto[];
  },

  /**
   * Lista TODOS los adjuntos de un paciente (vista médica con join).
   * Usado por AtenderCita en el panel "Adjuntos previos".
   */
  async listarPorPacienteMedico(idPaciente: number | string): Promise<Adjunto[]> {
    const { data, error } = await supabase
      .from('vw_medico_adjuntos_paciente')
      .select('*')
      .eq('id_paciente', idPaciente);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Adjunto[];
  },

  /** Lista los adjuntos del paciente autenticado (vista filtrada por RLS). */
  async listarMios(): Promise<Adjunto[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_adjuntos')
      .select('*');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Adjunto[];
  },

  /**
   * Genera una URL firmada temporal para descargar/visualizar el archivo.
   * Válida 1 hora por defecto.
   */
  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn);
    if (error) throw new ServiceError(`No se pudo generar URL: ${error.message}`);
    if (!data?.signedUrl) throw new ServiceError('URL firmada vacía.');
    return data.signedUrl;
  },

  /**
   * Genera signed URLs en lote (útil para listas con muchos thumbnails).
   */
  async getSignedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, expiresIn);
    if (error) throw new ServiceError(`No se pudieron generar URLs: ${error.message}`);
    const out: Record<string, string> = {};
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
    }
    return out;
  },

  /**
   * Descarga el archivo como Blob (para forzar download con nombre original).
   */
  async descargar(adjunto: Adjunto): Promise<void> {
    const url = await this.getSignedUrl(adjunto.storage_path);
    const res = await fetch(url);
    if (!res.ok) throw new ServiceError('No se pudo descargar el archivo.');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = adjunto.nombre_archivo;
    a.click();
    URL.revokeObjectURL(objUrl);
  },

  /**
   * Soft-delete del adjunto + borra del bucket. Solo el médico que lo subió o
   * un admin pueden hacerlo (RLS lo enforza).
   */
  async eliminar(adjunto: Adjunto): Promise<void> {
    // 1. Soft-delete en BD
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from(TABLE)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: authData?.user?.id ?? null,
      })
      .eq('id_adjunto', adjunto.id_adjunto);
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Solo el médico que subió el archivo puede eliminarlo.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }

    // 2. Borrar del bucket (best-effort: si falla, queda huérfano pero la
    //    fila ya está marcada como borrada y no se mostrará).
    await supabase.storage.from(BUCKET).remove([adjunto.storage_path]);
  },
};

export default adjuntoService;
