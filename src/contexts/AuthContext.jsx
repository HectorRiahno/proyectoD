import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import usuarioService from '../services/usuarioService';
import { ROLE_CLIENTE, normalizeRoleName } from '../config/roles';

export const AuthContext = createContext(null);

const buildUserFromSession = (session) => {
  const user = session?.user;
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const rol_nombre = normalizeRoleName(metadata.role || metadata.rol || metadata.id_rol);

  return {
    id: user.id,
    nombre: metadata.nombre || metadata.name || user.email?.split('@')[0] || '',
    correo: user.email,
    id_rol: metadata.id_rol || null,
    rol_nombre,
    ...metadata,
  };
};

export function AuthProvider({ children }) {
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsuario = async (session) => {
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('No se encontró el identificador de usuario');
    }

    try {
      return await usuarioService.getByIdWithRol(userId);
    } catch (err) {
      console.warn('No se encontró el usuario en la tabla usuario, usando metadata de sesión', err);
      return buildUserFromSession(session);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const usuario = await fetchUsuario(session);
          if (mounted) setUsuarioLogueado(usuario);
        }
      } catch (err) {
        console.error('Error verificando sesión:', err);
        if (mounted) setError(err.message ?? 'Error verificando sesión');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUsuarioLogueado(null);
        return;
      }

      try {
        const usuario = await fetchUsuario(session);
        setUsuarioLogueado(usuario);
      } catch (err) {
        console.error('Error cargando perfil después de auth state change:', err);
        setError(err.message ?? 'Error cargando perfil de usuario');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      return data;
    } catch (err) {
      setError(err.message ?? 'Error en el inicio de sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getRoleIdByName = async (rolNombre) => {
    const { data, error } = await supabase
      .from('rol')
      .select('id')
      .eq('nombre', rolNombre)
      .single();

    if (error) throw error;
    return data?.id;
  };

  const registro = async (email, password, nombre, rolNombre = ROLE_CLIENTE) => {
    try {
      setLoading(true);
      setError(null);

      const rol_id = await getRoleIdByName(normalizeRoleName(rolNombre));

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            id_rol: rol_id,
            rol_nombre: normalizeRoleName(rolNombre),
          },
        },
      });

      if (signUpError) throw signUpError;
      return data;
    } catch (err) {
      setError(err.message ?? 'Error al registrar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await supabase.auth.signOut();
      setUsuarioLogueado(null);
    } catch (err) {
      setError(err.message ?? 'Error al cerrar sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const actualizarUsuario = async (id, updates) => {
    try {
      setLoading(true);
      setError(null);
      await usuarioService.update(id, updates);
      const usuarioActualizado = await usuarioService.getById(id);
      setUsuarioLogueado(usuarioActualizado);
      return usuarioActualizado;
    } catch (err) {
      setError(err.message ?? 'Error actualizando usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    usuarioLogueado,
    loading,
    error,
    login,
    registro,
    logout,
    actualizarUsuario,
    estaLogueado: !!usuarioLogueado,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
