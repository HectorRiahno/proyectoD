/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Faltan variables de entorno de Supabase en .env');
}

// ─── Cliente con auto-refresh y persistencia de sesión ────────────────────────
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:  true,   // renueva el JWT antes de que expire
    persistSession:    true,   // guarda la sesión en localStorage
    detectSessionInUrl: true,  // captura el token de la URL (magic links, OAuth)
    storageKey:        'hospitalis-session',
  },
});

// ─── Utilidad: detecta si un error de Supabase es de sesión expirada ──────────
export function esErrorDeSesion(error: { status?: number; code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.status === 401 ||
    error.status === 400 ||
    error.code  === 'PGRST301' ||               // JWT expired
    error.code  === 'invalid_jwt'  ||
    (error.message ?? '').toLowerCase().includes('jwt expired') ||
    (error.message ?? '').toLowerCase().includes('invalid token') ||
    (error.message ?? '').toLowerCase().includes('not authenticated')
  );
}

// ─── Helpers genéricos (usados por servicios legacy) ──────────────────────────
type TableName = string;
type IdType    = number | string;
type RowData   = Record<string, unknown> | unknown[];
type UpdateData = Record<string, unknown>;

export const supabaseHelpers = {
  async getAll(table: TableName): Promise<unknown[]> {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data || [];
  },

  async getById(table: TableName, id: IdType): Promise<unknown> {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async insert(table: TableName, row: RowData | RowData[]): Promise<unknown[]> {
    const { data, error } = await supabase.from(table).insert(row).select();
    if (error) throw error;
    return data || [];
  },

  async update(table: TableName, id: IdType, updates: UpdateData): Promise<unknown[]> {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
    if (error) throw error;
    return data || [];
  },

  async remove(table: TableName, id: IdType): Promise<boolean> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async search(table: TableName, field: string, value: string): Promise<unknown[]> {
    const { data, error } = await supabase.from(table).select('*').ilike(field, `%${value}%`);
    if (error) throw error;
    return data || [];
  },
};

export default supabase;
