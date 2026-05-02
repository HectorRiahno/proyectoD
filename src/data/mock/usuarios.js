// Datos de muestra para desarrollo local
// Estos datos se utilizan cuando no hay conexión a Supabase

export const usuarios = [
  {
    id: 1,
    documento: "10203040",
    usuario: "admin",
    contrasena: "admin123",
    nombre: "Administrador"
  },
  {
    id: 2,
    documento: "100200300",
    usuario: "maria.gomez",
    contrasena: "pass123",
    nombre: "María Gómez"
  },
  {
    id: 3,
    documento: "200300400",
    usuario: "juan.perez",
    contrasena: "juan2024",
    nombre: "Juan Pérez"
  }
];

// Función para validar credenciales (mock)
export function validarCredenciales(usuario, contrasena) {
  return usuarios.find(
    u => u.usuario === usuario && u.contrasena === contrasena
  );
}

// Función para buscar usuario por nombre de usuario
export function buscarPorUsuario(usuario) {
  return usuarios.find(u => u.usuario === usuario);
}

// Función para buscar usuario por documento
export function buscarPorDocumento(documento) {
  return usuarios.find(u => u.documento === documento);
}