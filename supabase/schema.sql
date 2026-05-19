-- =====================================================================
-- Sistema Clínico / Médico
-- Esquema generado a partir del diagrama de Lucidchart
-- Base de datos: PostgreSQL (Supabase)
-- =====================================================================

-- Limpieza opcional (descomentar si necesitas reiniciar)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- =====================================================================
-- TABLAS BASE: PERSONAS, ROLES, USUARIOS
-- =====================================================================

CREATE TABLE persona (
    id_persona       BIGSERIAL PRIMARY KEY,
    documento        VARCHAR(20)  UNIQUE NOT NULL,
    tipo_documento   VARCHAR(10)  NOT NULL DEFAULT 'CC',
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero           VARCHAR(20),
    telefono         VARCHAR(20),
    direccion        TEXT,
    email            VARCHAR(120) UNIQUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rol (
    id_rol      BIGSERIAL PRIMARY KEY,
    nombre      VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usuario (
    id_usuario     BIGSERIAL PRIMARY KEY,
    id_persona     BIGINT NOT NULL REFERENCES persona(id_persona) ON DELETE CASCADE,
    username       VARCHAR(50) UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    activo         BOOLEAN DEFAULT TRUE,
    ultimo_acceso  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asignacion_rol (
    id_asignacion    BIGSERIAL PRIMARY KEY,
    id_usuario       BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_rol           BIGINT NOT NULL REFERENCES rol(id_rol) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (id_usuario, id_rol)
);

-- =====================================================================
-- PERSONAL MÉDICO
-- =====================================================================

CREATE TABLE medico (
    id_medico         BIGSERIAL PRIMARY KEY,
    id_persona        BIGINT UNIQUE NOT NULL REFERENCES persona(id_persona) ON DELETE CASCADE,
    numero_licencia   VARCHAR(50) UNIQUE NOT NULL,
    especialidad      VARCHAR(100),
    anios_experiencia INTEGER DEFAULT 0,
    consultorio       VARCHAR(50),
    activo            BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asistente (
    id_asistente BIGSERIAL PRIMARY KEY,
    id_persona   BIGINT UNIQUE NOT NULL REFERENCES persona(id_persona) ON DELETE CASCADE,
    id_medico    BIGINT REFERENCES medico(id_medico) ON DELETE SET NULL,
    cargo        VARCHAR(80),
    activo       BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE horario_medico (
    id_horario    BIGSERIAL PRIMARY KEY,
    id_medico     BIGINT NOT NULL REFERENCES medico(id_medico) ON DELETE CASCADE,
    dia_semana    VARCHAR(15) NOT NULL,
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    disponible    BOOLEAN DEFAULT TRUE,
    CHECK (hora_fin > hora_inicio)
);

-- =====================================================================
-- PACIENTES
-- =====================================================================

CREATE TABLE paciente (
    id_paciente            BIGSERIAL PRIMARY KEY,
    id_persona             BIGINT UNIQUE NOT NULL REFERENCES persona(id_persona) ON DELETE CASCADE,
    numero_historia        VARCHAR(30) UNIQUE NOT NULL,
    tipo_sangre            VARCHAR(5),
    alergias               TEXT,
    enfermedades_cronicas  TEXT,
    contacto_emergencia    VARCHAR(120),
    telefono_emergencia    VARCHAR(20),
    ocupacion              VARCHAR(80),
    estado_civil           VARCHAR(20),
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE estado_general (
    id_estado    BIGSERIAL PRIMARY KEY,
    id_paciente  BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    fecha        TIMESTAMPTZ DEFAULT NOW(),
    descripcion  TEXT,
    observaciones TEXT
);

CREATE TABLE signos_vitales (
    id_signos          BIGSERIAL PRIMARY KEY,
    id_paciente        BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    fecha_registro     TIMESTAMPTZ DEFAULT NOW(),
    presion_sistolica  INTEGER,
    presion_diastolica INTEGER,
    frecuencia_cardiaca INTEGER,
    frecuencia_respiratoria INTEGER,
    temperatura        NUMERIC(4,1),
    saturacion_oxigeno INTEGER,
    peso               NUMERIC(5,2),
    talla              NUMERIC(4,2),
    observaciones      TEXT
);

-- =====================================================================
-- CITAS Y CONSULTAS
-- =====================================================================

CREATE TABLE tipo_consulta (
    id_tipo_consulta BIGSERIAL PRIMARY KEY,
    nombre           VARCHAR(80) UNIQUE NOT NULL,
    descripcion      TEXT,
    duracion_min     INTEGER DEFAULT 30,
    costo            NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE cita (
    id_cita          BIGSERIAL PRIMARY KEY,
    id_paciente      BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_medico        BIGINT NOT NULL REFERENCES medico(id_medico),
    id_tipo_consulta BIGINT REFERENCES tipo_consulta(id_tipo_consulta),
    fecha_cita       TIMESTAMPTZ NOT NULL,
    estado           VARCHAR(20) DEFAULT 'programada',
    motivo           TEXT,
    observaciones    TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    CHECK (estado IN ('programada','confirmada','en_curso','completada','cancelada','no_asistio'))
);

CREATE TABLE reserva (
    id_reserva       BIGSERIAL PRIMARY KEY,
    id_paciente      BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    id_medico        BIGINT NOT NULL REFERENCES medico(id_medico),
    id_horario       BIGINT REFERENCES horario_medico(id_horario),
    fecha_reserva    TIMESTAMPTZ DEFAULT NOW(),
    fecha_programada TIMESTAMPTZ NOT NULL,
    estado           VARCHAR(20) DEFAULT 'pendiente'
);

CREATE TABLE consulta_medica (
    id_consulta      BIGSERIAL PRIMARY KEY,
    id_cita          BIGINT UNIQUE REFERENCES cita(id_cita) ON DELETE CASCADE,
    id_paciente      BIGINT NOT NULL REFERENCES paciente(id_paciente),
    id_medico        BIGINT NOT NULL REFERENCES medico(id_medico),
    fecha_consulta   TIMESTAMPTZ DEFAULT NOW(),
    motivo_consulta  TEXT,
    examen_fisico    TEXT,
    impresion_diagnostica TEXT,
    plan_tratamiento TEXT,
    observaciones    TEXT
);

-- =====================================================================
-- SÍNTOMAS Y DIAGNÓSTICOS
-- =====================================================================

CREATE TABLE tipo_diagnostico (
    id_tipo_diagnostico BIGSERIAL PRIMARY KEY,
    nombre              VARCHAR(80) UNIQUE NOT NULL,
    descripcion         TEXT
);

CREATE TABLE diagnostico (
    id_diagnostico      BIGSERIAL PRIMARY KEY,
    id_consulta         BIGINT REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    id_tipo_diagnostico BIGINT REFERENCES tipo_diagnostico(id_tipo_diagnostico),
    codigo_cie10        VARCHAR(10),
    descripcion         TEXT NOT NULL,
    es_principal        BOOLEAN DEFAULT FALSE,
    fecha               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sintoma (
    id_sintoma  BIGSERIAL PRIMARY KEY,
    id_consulta BIGINT REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    nombre      VARCHAR(120) NOT NULL,
    descripcion TEXT,
    intensidad  VARCHAR(20),
    duracion    VARCHAR(80)
);

-- =====================================================================
-- MEDICAMENTOS Y TRATAMIENTOS
-- =====================================================================

CREATE TABLE categoria_medicamento (
    id_categoria BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(80) UNIQUE NOT NULL,
    descripcion  TEXT
);

CREATE TABLE medicamento (
    id_medicamento     BIGSERIAL PRIMARY KEY,
    id_categoria       BIGINT REFERENCES categoria_medicamento(id_categoria),
    nombre             VARCHAR(120) NOT NULL,
    nombre_generico    VARCHAR(120),
    presentacion       VARCHAR(80),
    concentracion      VARCHAR(50),
    via_administracion VARCHAR(50),
    stock              INTEGER DEFAULT 0,
    precio             NUMERIC(10,2) DEFAULT 0,
    activo             BOOLEAN DEFAULT TRUE
);

CREATE TABLE categoria_tratamiento (
    id_categoria BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(80) UNIQUE NOT NULL,
    descripcion  TEXT
);

CREATE TABLE tratamiento (
    id_tratamiento BIGSERIAL PRIMARY KEY,
    id_categoria   BIGINT REFERENCES categoria_tratamiento(id_categoria),
    id_consulta    BIGINT REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    nombre         VARCHAR(120) NOT NULL,
    descripcion    TEXT,
    duracion_dias  INTEGER,
    fecha_inicio   DATE,
    fecha_fin      DATE,
    estado         VARCHAR(20) DEFAULT 'activo'
);

CREATE TABLE orden_medica (
    id_orden       BIGSERIAL PRIMARY KEY,
    id_consulta    BIGINT REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    id_medicamento BIGINT REFERENCES medicamento(id_medicamento),
    id_tratamiento BIGINT REFERENCES tratamiento(id_tratamiento),
    dosis          VARCHAR(80),
    frecuencia     VARCHAR(80),
    duracion       VARCHAR(80),
    indicaciones   TEXT,
    fecha_emision  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- PROCEDIMIENTOS Y CIRUGÍAS
-- =====================================================================

CREATE TABLE tipo_procedimiento (
    id_tipo     BIGSERIAL PRIMARY KEY,
    nombre      VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE procedimiento (
    id_procedimiento BIGSERIAL PRIMARY KEY,
    id_tipo          BIGINT REFERENCES tipo_procedimiento(id_tipo),
    nombre           VARCHAR(120) NOT NULL,
    descripcion      TEXT,
    costo            NUMERIC(10,2) DEFAULT 0,
    requiere_ayuno   BOOLEAN DEFAULT FALSE
);

CREATE TABLE cirugia (
    id_cirugia      BIGSERIAL PRIMARY KEY,
    id_paciente     BIGINT NOT NULL REFERENCES paciente(id_paciente),
    id_medico       BIGINT NOT NULL REFERENCES medico(id_medico),
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    fecha_programada TIMESTAMPTZ,
    fecha_realizada TIMESTAMPTZ,
    duracion_min    INTEGER,
    estado          VARCHAR(20) DEFAULT 'programada',
    observaciones   TEXT
);

CREATE TABLE procedimiento_quirurgico (
    id_proc_quirurgico BIGSERIAL PRIMARY KEY,
    id_cirugia         BIGINT NOT NULL REFERENCES cirugia(id_cirugia) ON DELETE CASCADE,
    id_procedimiento   BIGINT NOT NULL REFERENCES procedimiento(id_procedimiento),
    orden              INTEGER DEFAULT 1,
    notas              TEXT
);

-- =====================================================================
-- VACUNAS
-- =====================================================================

CREATE TABLE vacuna (
    id_vacuna      BIGSERIAL PRIMARY KEY,
    id_paciente    BIGINT NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    nombre         VARCHAR(120) NOT NULL,
    dosis          VARCHAR(50),
    fecha_aplicacion DATE NOT NULL,
    lote           VARCHAR(50),
    aplicada_por   BIGINT REFERENCES medico(id_medico),
    observaciones  TEXT
);

-- =====================================================================
-- FACTURACIÓN
-- =====================================================================

CREATE TABLE factura (
    id_factura     BIGSERIAL PRIMARY KEY,
    id_paciente    BIGINT NOT NULL REFERENCES paciente(id_paciente),
    id_consulta    BIGINT REFERENCES consulta_medica(id_consulta),
    numero_factura VARCHAR(30) UNIQUE NOT NULL,
    fecha_emision  TIMESTAMPTZ DEFAULT NOW(),
    subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuesto       NUMERIC(12,2) NOT NULL DEFAULT 0,
    total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado         VARCHAR(20) DEFAULT 'pendiente',
    metodo_pago    VARCHAR(30),
    CHECK (estado IN ('pendiente','pagada','anulada','vencida'))
);

-- =====================================================================
-- ÍNDICES ÚTILES
-- =====================================================================

CREATE INDEX idx_persona_documento     ON persona(documento);
CREATE INDEX idx_usuario_username      ON usuario(username);
CREATE INDEX idx_paciente_historia     ON paciente(numero_historia);
CREATE INDEX idx_cita_fecha            ON cita(fecha_cita);
CREATE INDEX idx_cita_paciente         ON cita(id_paciente);
CREATE INDEX idx_cita_medico           ON cita(id_medico);
CREATE INDEX idx_consulta_paciente     ON consulta_medica(id_paciente);
CREATE INDEX idx_diagnostico_consulta  ON diagnostico(id_consulta);
CREATE INDEX idx_orden_consulta        ON orden_medica(id_consulta);
CREATE INDEX idx_factura_paciente      ON factura(id_paciente);

-- =====================================================================
-- TRIGGER: updated_at automático
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persona_updated  BEFORE UPDATE ON persona  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_usuario_updated  BEFORE UPDATE ON usuario  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY (Supabase) — habilitar y políticas básicas
-- =====================================================================

ALTER TABLE persona            ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol                ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_rol     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medico             ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistente          ENABLE ROW LEVEL SECURITY;
ALTER TABLE horario_medico     ENABLE ROW LEVEL SECURITY;
ALTER TABLE paciente           ENABLE ROW LEVEL SECURITY;
ALTER TABLE estado_general     ENABLE ROW LEVEL SECURITY;
ALTER TABLE signos_vitales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_consulta      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cita               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva            ENABLE ROW LEVEL SECURITY;
ALTER TABLE consulta_medica    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_diagnostico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostico        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sintoma            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_medicamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamento        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_tratamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamiento        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_medica       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_procedimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimiento      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cirugia            ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimiento_quirurgico ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacuna             ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura            ENABLE ROW LEVEL SECURITY;

-- Política básica: usuarios autenticados pueden leer
-- (ajusta según tus reglas de negocio reales)
CREATE POLICY "auth_read_persona"   ON persona   FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_paciente"  ON paciente  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_medico"    ON medico    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_cita"      ON cita      FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_read_consulta"  ON consulta_medica FOR SELECT TO authenticated USING (TRUE);

-- =====================================================================
-- DATOS INICIALES (semillas)
-- =====================================================================

INSERT INTO rol (nombre, descripcion) VALUES
    ('admin',     'Administrador del sistema'),
    ('medico',    'Profesional médico'),
    ('asistente', 'Asistente médico / recepción'),
    ('cliente',   'Paciente / cliente del centro');

INSERT INTO tipo_consulta (nombre, descripcion, duracion_min) VALUES
    ('General',     'Consulta médica general',            30),
    ('Control',     'Consulta de seguimiento',            20),
    ('Urgencia',    'Atención de urgencias',              45),
    ('Especialista','Consulta con médico especialista',   40);
