// Datos de muestra de medicamentos para desarrollo local
export const medicamentos = [
  {
    id: 1,
    pacienteId: 1,
    doctorId: 1,
    nombre: "Enalapril",
    dosis: "10 mg",
    frecuencia: "2 veces al día",
    via: "Oral",
    inicio: "2024-09-19",
    fin: "2024-12-19",
    recargasRestantes: 2,
    indicacion: "Hipertensión arterial",
    instrucciones: "Tomar con alimentos. Evitar el alcohol.",
    efectosSecundarios: "Mareos, tos seca, fatiga",
    interacciones: "Diuréticos, AINEs",
    estado: "Activo",
    ultimaActualizacion: "2024-09-24"
  },
  {
    id: 2,
    pacienteId: 2,
    doctorId: 5,
    nombre: "Metformina",
    dosis: "850 mg",
    frecuencia: "3 veces al día",
    via: "Oral",
    inicio: "2024-09-25",
    fin: "2024-12-25",
    recargasRestantes: 3,
    indicacion: "Diabetes tipo 2",
    instrucciones: "Tomar después de las comidas.",
    efectosSecundarios: "Náuseas leves, malestar estomacal",
    interacciones: "Alcohol, corticoides",
    estado: "Completados",
    ultimaActualizacion: "2024-09-30"
  }
];

// Función para obtener medicamentos por paciente
export function getMedicamentosByPaciente(pacienteId) {
  return medicamentos.filter(m => m.pacienteId === pacienteId);
}

// Función para obtener medicamentos activos
export function getMedicamentosActivos() {
  return medicamentos.filter(m => m.estado === "Activo");
}