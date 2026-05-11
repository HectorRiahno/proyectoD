import { supabase } from '../lib/supabase';

// NOTA: En la BD real no existe una tabla `alergias` separada.
// Las alergias se guardan en la columna `paciente.alergias` (TEXT libre).
// Este servicio expone una API similar a la anterior pero opera sobre ese campo.

const TABLE = 'paciente';

export interface Alergia {
  id_paciente?: number;
  alergias?: string;          // texto libre con todas las alergias
  [key: string]: unknown;
}

export const alergiaService = {
  /**
   * Devuelve las alergias de un paciente (campo TEXT).
   */
  async getByPaciente(pacienteId: number): Promise<Alergia | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id_paciente, alergias')
      .eq('id_paciente', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Alergia | null;
  },

  /**
   * Alergias del PACIENTE autenticado (vía vista).
   */
  async getMisAlergias(): Promise<Alergia | null> {
    const { data, error } = await supabase
      .from('vw_paciente_mi_perfil')
      .select('id_paciente, alergias')
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Alergia | null;
  },

  /**
   * Actualiza el campo `alergias` del paciente.
   */
  async updateForPaciente(pacienteId: number, alergias: string): Promise<Alergia[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ alergias })
      .eq('id_paciente', pacienteId)
      .select('id_paciente, alergias');
    if (error) throw error;
    return (data ?? []) as Alergia[];
  },

  /**
   * Listado global de pacientes con sus alergias (vista admin).
   */
  async getAll(): Promise<Alergia[]> {
    const { data, error } = await supabase
      .from('vw_admin_pacientes')
      .select('id_paciente, nombre_completo, alergias');
    if (error) throw error;
    return (data ?? []) as Alergia[];
  },
};

export default alergiaService;
