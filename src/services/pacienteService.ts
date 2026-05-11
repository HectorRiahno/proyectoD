import { supabase } from '../lib/supabase';

// Tabla: paciente (id_paciente, id_persona, numero_historia, tipo_sangre, ...)
// Vista: vw_admin_pacientes (incluye persona + edad calculada + total_citas)
const TABLE = 'paciente';
const VIEW  = 'vw_admin_pacientes';

export interface Paciente {
  id_paciente?: number;
  id_persona?: number;
  numero_historia?: string;
  tipo_sangre?: string;
  alergias?: string;
  contacto_emergencia?: string;
  ocupacion?: string;
  estado_civil?: string;
  // Campos de persona (vía la vista)
  documento?: string;
  tipo_documento?: string;
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  fecha_nacimiento?: string;
  edad?: number;
  genero?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  total_citas?: number;
  ultima_visita?: string;
  [key: string]: unknown;
}

export const pacienteService = {
  async getAll(): Promise<Paciente[]> {
    const { data, error } = await supabase.from(VIEW).select('*');
    if (error) throw error;
    return (data ?? []) as Paciente[];
  },

  async getById(id: number | string): Promise<Paciente> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('id_paciente', id)
      .single();
    if (error) throw error;
    return data as Paciente;
  },

  async getByDocumento(documento: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('documento', documento)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Paciente | null;
  },

  /**
   * Búsqueda por nombre — usa `nombre_completo` de la vista.
   */
  async search(nombre: string): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .ilike('nombre_completo', `%${nombre}%`);
    if (error) throw error;
    return (data ?? []) as Paciente[];
  },

  /**
   * Crea un paciente. Nota: requiere que ya exista la persona en la tabla `persona`.
   * Pasa `id_persona` y demás campos específicos del paciente.
   */
  async create(paciente: Partial<Paciente>): Promise<Paciente[]> {
    const { data, error } = await supabase.from(TABLE).insert(paciente).select();
    if (error) throw error;
    return (data ?? []) as Paciente[];
  },

  async update(id: number | string, updates: Partial<Paciente>): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id_paciente', id)
      .select();
    if (error) throw error;
    return (data ?? []) as Paciente[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_paciente', id);
    if (error) throw error;
    return true;
  },

  /**
   * Devuelve el perfil del paciente AUTENTICADO (vista filtrada por auth.email()).
   */
  async getMiPerfil(): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from('vw_paciente_mi_perfil')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Paciente | null;
  },
};

export default pacienteService;
