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
    const authUid = session?.user?.id;
    if (!authUid) {
      throw new Error('No se encontró el UUID de la sesión');
    }

    try {
      // Vínculo principal: auth.users.id → public.usuario.auth_user_id
      const usuario = await usuarioService.getByAuthUserId(authUid);
      if (!usuario) {
        console.warn('No existe fila en public.usuario para auth UUID:', authUid);
        return buildUserFromSession(session);
      }
      return usuario;
    } catch (err) {
      console.warn('Error consultando usuario, usando metadata de sesión', err);
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

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
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
      .select('id_rol')
      .eq('nombre', rolNombre)
      .single();

    if (error) throw error;
    return data?.id_rol;
  };

  /**
   * Validador de contraseña fuerte.
   * Reglas: mínimo 8 caracteres, al menos una letra y un número.
   */
  const validarPassword = (password) => {
    if (!password || password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Za-z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra';
    }
    if (!/\d/.test(password)) {
      return 'La contraseña debe contener al menos un número';
    }
    return null;
  };

  const registro = async (email, password, nombre, rolNombre = ROLE_CLIENTE) => {
    try {
      setLoading(true);
      setError(null);

      const pwdError = validarPassword(password);
      if (pwdError) throw new Error(pwdError);

      const rolNormalizado = normalizeRoleName(rolNombre);
      const rol_id = await getRoleIdByName(rolNormalizado);

      // signUp inicia sesión en algunos modos. El trigger SQL crea la fila
      // en public.usuario con el mismo UUID automáticamente.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            nombre,
            rol: rolNormalizado,
            id_rol: rol_id,
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
