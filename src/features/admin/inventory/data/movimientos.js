export const movimientos = [
  {
    id: 1,
    tipo: "Entrada",
    productoId: 1,
    productoNombre: "Paracetamol 500mg",
    cantidad: 500,
    fecha: "2024-10-20",
    responsable: "María Gómez",
    motivo: "Compra",
    proveedor: "FarmaCorp",
    observaciones: "Pedido #1234"
  },
  {
    id: 2,
    tipo: "Salida",
    productoId: 1,
    productoNombre: "Paracetamol 500mg",
    cantidad: 150,
    fecha: "2024-10-22",
    responsable: "Juan Pérez",
    motivo: "Dispensación",
    destino: "Farmacia Piso 2",
    observaciones: "Abastecimiento rutinario"
  },
  {
    id: 3,
    tipo: "Entrada",
    productoId: 5,
    productoNombre: "Jeringa 5ml",
    cantidad: 1000,
    fecha: "2024-10-19",
    responsable: "María Gómez",
    motivo: "Compra",
    proveedor: "Supplies Med",
    observaciones: "Pedido urgente"
  },
  {
    id: 4,
    tipo: "Salida",
    productoId: 6,
    productoNombre: "Guantes de Látex Talla M",
    cantidad: 200,
    fecha: "2024-10-21",
    responsable: "Juan Pérez",
    motivo: "Dispensación",
    destino: "Urgencias",
    observaciones: "Solicitud urgente"
  },
  {
    id: 5,
    tipo: "Ajuste",
    productoId: 3,
    productoNombre: "Amoxicilina 500mg",
    cantidad: -20,
    fecha: "2024-10-18",
    responsable: "Administrador",
    motivo: "Vencimiento",
    observaciones: "Productos vencidos retirados"
  },
  {
    id: 6,
    tipo: "Entrada",
    productoId: 11,
    productoNombre: "Oxímetro de Pulso",
    cantidad: 10,
    fecha: "2024-10-17",
    responsable: "María Gómez",
    motivo: "Compra",
    proveedor: "MedTech Solutions",
    observaciones: "Nueva adquisición"
  },
  {
    id: 7,
    tipo: "Salida",
    productoId: 9,
    productoNombre: "Mascarilla N95",
    cantidad: 300,
    fecha: "2024-10-23",
    responsable: "Juan Pérez",
    motivo: "Dispensación",
    destino: "Área COVID",
    observaciones: "Protocolo de bioseguridad"
  }
];
