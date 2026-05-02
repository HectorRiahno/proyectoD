// Índice de servicios de Supabase
// Exporta todos los servicios para un acceso centralizado

import { supabase, supabaseHelpers } from '../lib/supabase';
export { default as usuarioService, type Usuario } from './usuarioService';
export { default as pacienteService, type Paciente } from './pacienteService';
export { default as citaService, type Cita } from './citaService';
export { default as medicamentoService, type Medicamento } from './medicamentoService';
export { default as alergiaService, type Alergia } from './alergiaService';
export { default as historialService, type HistorialMedico } from './historialService';