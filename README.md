# 🏥 HospitalIS Pro - Sistema de Gestión Hospitalaria

Sistema integral de gestión hospitalaria con dashboards diferenciados para empleados y clientes/pacientes, incluyendo gestión completa de inventarios médicos.

## ✨ Características Principales

### 👨‍⚕️ Dashboard para Empleados
- 📊 Panel de estadísticas y métricas del hospital
- 📅 Gestión completa de citas médicas
- 📦 **Sistema de Inventario Completo** (Nuevo)
  - CRUD de productos médicos
  - Control de stock con alertas automáticas
  - Gestión de proveedores y categorías
  - Múltiples vistas (lista/cuadrícula)
  - Exportación de datos
- 👥 Gestión de pacientes con historiales detallados

### 🧑‍⚕️ Dashboard para Clientes/Pacientes
- 🏠 Dashboard personalizado con información relevante
- 📅 Visualización y gestión de citas
- 📋 Historial médico completo
- 💊 Control de medicamentos activos
- 🔬 Resultados de laboratorio e imágenes
- 📞 Contacto directo con el hospital

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# El proyecto estará disponible en http://localhost:5173
```

## 👤 Usuarios de Prueba

### Empleados del Hospital:
| Usuario | Contraseña | Documento | Rol |
|---------|-----------|-----------|-----|
| admin | admin123 | 10203040 | Administrador |
| maria.gomez | pass123 | 100200300 | Médico |
| juan.perez | juan2024 | 200300400 | Enfermero |

### Clientes/Pacientes:
| Usuario | Contraseña | Documento |
|---------|-----------|-----------|
| carlos.lopez | carlos123 | 300400500 |
| ana.rodriguez | ana2024 | 400500600 |
| luis.martinez | luis456 | 500600700 |


```

Ver [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) para más detalles.

## 🛠️ Tecnologías

- **React 19.1** - Framework UI
- **React Router DOM 7.9** - Enrutamiento
- **Tailwind CSS 4.1** - Estilos
- **Lucide React** - Iconos
- **Vite 7.1** - Build tool
- **JSON** - Almacenamiento de datos

## 📦 Sistema de Inventario

El sistema incluye gestión completa de inventario con:

- ✅ 15 productos de ejemplo (medicamentos, equipos, insumos)
- ✅ 3 categorías con subcategorías
- ✅ 6 proveedores configurados
- ✅ Control de stock y alertas
- ✅ Gestión de vencimientos
- ✅ Historial de movimientos
- ✅ Búsqueda y filtros avanzados

## 🎨 Características de UI/UX

- 🎨 Diseño moderno y profesional
- 📱 Responsive design
- ✨ Animaciones y transiciones suaves
- 🎯 Navegación intuitiva según rol
- 🔔 Sistema de notificaciones
- 🌈 Paleta de colores consistente
- ⚡ Rendimiento optimizado

## 🔐 Sistema de Roles

El sistema diferencia automáticamente entre:

1. **Empleados**: Acceso completo al sistema, gestión de inventario, pacientes y citas
2. **Clientes**: Vista personalizada de su información médica, citas y resultados

## 📝 Scripts Disponibles

```bash
npm run dev      # Modo desarrollo
npm run build    # Build producción
npm run preview  # Preview del build
npm run lint     # Linter
```

## 🔄 Próximas Funcionalidades

- [ ] Integración con backend real
- [ ] Autenticación JWT
- [ ] Sistema de reportes
- [ ] Notificaciones en tiempo real
- [ ] Exportación de reportes PDF
- [ ] Sistema de facturación
- [ ] Telemedicina integrada

## 📄 Licencia

Proyecto educativo - HospitalIS Pro

---

**Desarrollado con ❤️ para gestión hospitalaria moderna**
