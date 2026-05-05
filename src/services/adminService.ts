export interface CreateDoctorPayload {
  nombre: string;
  correo: string;
  especialidad: string;
  password: string;
  id_rol?: number;
}

export async function createDoctorAccount(payload: CreateDoctorPayload) {
  const endpoint = import.meta.env.VITE_CREATE_DOCTOR_URL;

  if (!endpoint) {
    throw new Error('VITE_CREATE_DOCTOR_URL no está configurado en el archivo .env');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nombre: payload.nombre,
      correo: payload.correo,
      especialidad: payload.especialidad,
      password: payload.password,
      id_rol: payload.id_rol ?? 2,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error creando usuario médico');
  }

  return data;
}
