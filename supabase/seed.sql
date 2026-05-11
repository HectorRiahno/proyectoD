-- =====================================================================
-- DATOS DE PRUEBA - Sistema Clínico
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERSONAS (base para usuarios, médicos, pacientes, asistentes)
-- ---------------------------------------------------------------------
INSERT INTO persona (documento, tipo_documento, nombres, apellidos, fecha_nacimiento, genero, telefono, direccion, email) VALUES
    ('1090123456', 'CC', 'Carlos Andrés',  'Ramírez López',    '1985-03-12', 'Masculino', '3001234567', 'Cra 15 #10-23, Cúcuta',    'carlos.ramirez@clinica.com'),
    ('1090234567', 'CC', 'María Fernanda', 'Gómez Pérez',      '1990-07-25', 'Femenino',  '3017654321', 'Av 5 #20-15, Ocaña',       'maria.gomez@clinica.com'),
    ('1090345678', 'CC', 'Juan Pablo',     'Martínez Silva',   '1978-11-30', 'Masculino', '3025551122', 'Calle 8 #4-10, Pamplona',  'juan.martinez@clinica.com'),
    ('1090456789', 'CC', 'Laura Camila',   'Hernández Ruiz',   '1995-02-14', 'Femenino',  '3034445566', 'Cra 7 #15-30, Cúcuta',     'laura.hernandez@clinica.com'),
    ('1090567890', 'CC', 'Diego Alejandro','Rojas Castro',     '1982-09-08', 'Masculino', '3046667788', 'Calle 12 #3-45, Ocaña',    'diego.rojas@clinica.com'),
    ('1090678901', 'CC', 'Ana Sofía',      'Vargas Mendoza',   '2000-05-20', 'Femenino',  '3058889900', 'Av 1 #25-12, Cúcuta',      'ana.vargas@correo.com'),
    ('1090789012', 'CC', 'Héctor José',    'Riaño López',      '1998-12-01', 'Masculino', '3069991122', 'Cra 20 #18-50, Ocaña',     'hector.riano@correo.com'),
    ('1090890123', 'CC', 'Valentina',      'Cárdenas Díaz',    '1992-04-17', 'Femenino',  '3072223344', 'Calle 5 #10-25, Pamplona', 'valentina.cardenas@correo.com'),
    ('1090901234', 'CC', 'Sebastián',      'Torres Acosta',    '1975-08-22', 'Masculino', '3083334455', 'Av 9 #30-18, Cúcuta',      'sebastian.torres@correo.com'),
    ('1091012345', 'CC', 'Isabella',       'Morales Quintero', '2005-01-10', 'Femenino',  '3094445566', 'Cra 3 #7-19, Ocaña',       'isabella.morales@correo.com');

-- ---------------------------------------------------------------------
-- ROLES (ya insertados en schema.sql — evitar duplicados)
-- ---------------------------------------------------------------------
INSERT INTO rol (nombre, descripcion) VALUES
    ('admin',     'Administrador del sistema'),
    ('medico',    'Profesional médico'),
    ('asistente', 'Asistente médico / recepción'),
    ('paciente',  'Paciente del centro')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- USUARIOS (los primeros 5 personas tienen acceso al sistema)
-- ---------------------------------------------------------------------
INSERT INTO usuario (id_persona, username, password_hash, activo) VALUES
    (1, 'cramirez',  '$2b$10$hashSimuladoAdmin111111111111111111111', TRUE),
    (2, 'mgomez',    '$2b$10$hashSimuladoMedico22222222222222222222', TRUE),
    (3, 'jmartinez', '$2b$10$hashSimuladoMedico33333333333333333333', TRUE),
    (4, 'lhernandez','$2b$10$hashSimuladoAsist444444444444444444444', TRUE),
    (5, 'drojas',    '$2b$10$hashSimuladoMedico55555555555555555555', TRUE);

-- ---------------------------------------------------------------------
-- ASIGNACIÓN DE ROLES
-- ---------------------------------------------------------------------
INSERT INTO asignacion_rol (id_usuario, id_rol) VALUES
    (1, 1),  -- Carlos -> admin
    (2, 2),  -- María -> médico
    (3, 2),  -- Juan -> médico
    (4, 3),  -- Laura -> asistente
    (5, 2);  -- Diego -> médico

-- ---------------------------------------------------------------------
-- MÉDICOS
-- ---------------------------------------------------------------------
INSERT INTO medico (id_persona, numero_licencia, especialidad, anios_experiencia, consultorio, activo) VALUES
    (2, 'MP-12345', 'Medicina General',  8,  'Consultorio 101', TRUE),
    (3, 'MP-23456', 'Cardiología',       15, 'Consultorio 205', TRUE),
    (5, 'MP-34567', 'Pediatría',         10, 'Consultorio 110', TRUE);

-- ---------------------------------------------------------------------
-- ASISTENTES
-- ---------------------------------------------------------------------
INSERT INTO asistente (id_persona, id_medico, cargo, activo) VALUES
    (4, 1, 'Asistente médica', TRUE);

-- ---------------------------------------------------------------------
-- HORARIOS MÉDICOS
-- ---------------------------------------------------------------------
INSERT INTO horario_medico (id_medico, dia_semana, hora_inicio, hora_fin, disponible) VALUES
    (1, 'Lunes',     '08:00', '12:00', TRUE),
    (1, 'Lunes',     '14:00', '18:00', TRUE),
    (1, 'Miércoles', '08:00', '12:00', TRUE),
    (2, 'Martes',    '09:00', '13:00', TRUE),
    (2, 'Jueves',    '09:00', '13:00', TRUE),
    (3, 'Lunes',     '07:00', '11:00', TRUE),
    (3, 'Viernes',   '14:00', '18:00', TRUE);

-- ---------------------------------------------------------------------
-- PACIENTES
-- ---------------------------------------------------------------------
INSERT INTO paciente (id_persona, numero_historia, tipo_sangre, alergias, enfermedades_cronicas, contacto_emergencia, telefono_emergencia, ocupacion, estado_civil) VALUES
    (6,  'HC-0001', 'O+',  'Penicilina',         'Ninguna',                  'Pedro Vargas',    '3201234567', 'Estudiante',  'Soltera'),
    (7,  'HC-0002', 'A+',  'Ninguna conocida',   'Asma leve',                'Marta López',     '3209876543', 'Ingeniero',   'Soltero'),
    (8,  'HC-0003', 'B-',  'Ibuprofeno',         'Hipertensión arterial',    'Luis Cárdenas',   '3215554433', 'Docente',     'Casada'),
    (9,  'HC-0004', 'AB+', 'Polvo, ácaros',      'Diabetes tipo 2',          'Carmen Torres',   '3226667788', 'Comerciante', 'Casado'),
    (10, 'HC-0005', 'O-',  'Mariscos',           'Ninguna',                  'Patricia Morales','3239998877', 'Estudiante',  'Soltera');

-- ---------------------------------------------------------------------
-- ESTADO GENERAL
-- ---------------------------------------------------------------------
INSERT INTO estado_general (id_paciente, descripcion, observaciones) VALUES
    (1, 'Estable',                    'Paciente refiere sentirse bien.'),
    (2, 'Crónico controlado',         'Asma bajo tratamiento, sin crisis recientes.'),
    (3, 'Requiere seguimiento',       'TA elevada en última consulta.'),
    (4, 'Crónico con descompensación','Glicemia elevada. Ajustar tratamiento.'),
    (5, 'Sano',                       'Sin antecedentes patológicos relevantes.');

-- ---------------------------------------------------------------------
-- SIGNOS VITALES
-- ---------------------------------------------------------------------
INSERT INTO signos_vitales (id_paciente, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, temperatura, saturacion_oxigeno, peso, talla, observaciones) VALUES
    (1, 120, 80,  72, 16, 36.5, 98, 58.5, 1.65, 'Signos normales'),
    (2, 118, 78,  78, 18, 36.7, 97, 75.2, 1.78, 'Dentro de parámetros'),
    (3, 145, 92,  85, 18, 36.6, 96, 68.0, 1.62, 'Hipertensión grado 1'),
    (4, 130, 85,  80, 17, 36.8, 97, 82.5, 1.70, 'Glicemia 180 mg/dL'),
    (5, 110, 70,  70, 16, 36.4, 99, 52.0, 1.60, 'Normal');

-- ---------------------------------------------------------------------
-- TIPO CONSULTA (ya insertados en schema.sql — evitar duplicados)
-- ---------------------------------------------------------------------
INSERT INTO tipo_consulta (nombre, descripcion, duracion_min, costo) VALUES
    ('General',     'Consulta médica general',          30, 50000),
    ('Control',     'Consulta de seguimiento',          20, 35000),
    ('Urgencia',    'Atención de urgencias',            45, 120000),
    ('Especialista','Consulta con médico especialista', 40, 90000)
ON CONFLICT (nombre) DO UPDATE SET costo = EXCLUDED.costo;

-- ---------------------------------------------------------------------
-- CITAS
-- ---------------------------------------------------------------------
INSERT INTO cita (id_paciente, id_medico, id_tipo_consulta, fecha_cita, estado, motivo, observaciones) VALUES
    (1, 1, 1, NOW() + INTERVAL '2 days',  'programada', 'Dolor de cabeza recurrente', 'Primera consulta'),
    (2, 1, 2, NOW() + INTERVAL '5 days',  'confirmada', 'Control de asma',            NULL),
    (3, 2, 4, NOW() + INTERVAL '3 days',  'programada', 'Evaluación cardiológica',    'Paciente con HTA'),
    (4, 1, 2, NOW() - INTERVAL '7 days',  'completada', 'Control de diabetes',        'Ajuste de medicación'),
    (5, 3, 1, NOW() - INTERVAL '3 days',  'completada', 'Chequeo general',            'Paciente sana'),
    (1, 3, 3, NOW() - INTERVAL '1 day',   'completada', 'Fiebre alta',                'Urgencia atendida');

-- ---------------------------------------------------------------------
-- RESERVAS
-- ---------------------------------------------------------------------
INSERT INTO reserva (id_paciente, id_medico, id_horario, fecha_programada, estado) VALUES
    (2, 2, 4, NOW() + INTERVAL '7 days',  'pendiente'),
    (3, 2, 5, NOW() + INTERVAL '10 days', 'confirmada'),
    (5, 3, 6, NOW() + INTERVAL '14 days', 'pendiente');

-- ---------------------------------------------------------------------
-- CONSULTAS MÉDICAS (de las citas completadas)
-- ---------------------------------------------------------------------
INSERT INTO consulta_medica (id_cita, id_paciente, id_medico, motivo_consulta, examen_fisico, impresion_diagnostica, plan_tratamiento, observaciones) VALUES
    (4, 4, 1,
     'Control de diabetes tipo 2',
     'Paciente en buen estado general. Abdomen blando, no doloroso. Pulsos periféricos presentes.',
     'Diabetes mellitus tipo 2 mal controlada',
     'Aumentar metformina a 850 mg c/12h. Dieta hipoglucémica. Control en 1 mes.',
     'Solicitar HbA1c'),
    (5, 5, 3,
     'Chequeo de rutina pediátrico',
     'Niña en excelente estado nutricional. Auscultación cardio-pulmonar normal.',
     'Paciente sana',
     'Continuar esquema de vacunación. Alimentación balanceada.',
     'Próximo control en 6 meses'),
    (6, 1, 3,
     'Fiebre de 39°C de 2 días de evolución',
     'Faringe eritematosa, amígdalas hipertróficas con exudado.',
     'Faringoamigdalitis aguda bacteriana',
     'Amoxicilina 500 mg c/8h x 7 días. Acetaminofén PRN.',
     'Reposo relativo');

-- ---------------------------------------------------------------------
-- TIPOS DE DIAGNÓSTICO
-- ---------------------------------------------------------------------
INSERT INTO tipo_diagnostico (nombre, descripcion) VALUES
    ('Presuntivo',  'Diagnóstico preliminar pendiente de confirmación'),
    ('Confirmado',  'Diagnóstico confirmado con estudios complementarios'),
    ('Diferencial', 'Diagnóstico a descartar');

-- ---------------------------------------------------------------------
-- DIAGNÓSTICOS
-- ---------------------------------------------------------------------
INSERT INTO diagnostico (id_consulta, id_tipo_diagnostico, codigo_cie10, descripcion, es_principal) VALUES
    (1, 2, 'E11.9', 'Diabetes mellitus tipo 2 sin complicaciones',   TRUE),
    (1, 2, 'I10',   'Hipertensión arterial esencial',                FALSE),
    (3, 2, 'J03.9', 'Amigdalitis aguda, no especificada',            TRUE),
    (3, 1, 'R50.9', 'Fiebre, no especificada',                       FALSE);

-- ---------------------------------------------------------------------
-- SÍNTOMAS
-- ---------------------------------------------------------------------
INSERT INTO sintoma (id_consulta, nombre, descripcion, intensidad, duracion) VALUES
    (1, 'Poliuria',       'Aumento en frecuencia urinaria',       'Moderada', '2 semanas'),
    (1, 'Polidipsia',     'Sed excesiva',                         'Moderada', '2 semanas'),
    (3, 'Fiebre',         'Fiebre cuantificada en 39°C',          'Severa',   '2 días'),
    (3, 'Odinofagia',     'Dolor al deglutir',                    'Severa',   '2 días'),
    (3, 'Cefalea',        'Dolor de cabeza frontal',              'Leve',     '2 días');

-- ---------------------------------------------------------------------
-- CATEGORÍAS DE MEDICAMENTOS
-- ---------------------------------------------------------------------
INSERT INTO categoria_medicamento (nombre, descripcion) VALUES
    ('Antibióticos',     'Medicamentos para infecciones bacterianas'),
    ('Analgésicos',      'Medicamentos para alivio del dolor'),
    ('Antihipertensivos','Medicamentos para presión arterial alta'),
    ('Antidiabéticos',   'Medicamentos para diabetes'),
    ('Antiinflamatorios','Medicamentos antiinflamatorios');

-- ---------------------------------------------------------------------
-- MEDICAMENTOS
-- ---------------------------------------------------------------------
INSERT INTO medicamento (id_categoria, nombre, nombre_generico, presentacion, concentracion, via_administracion, stock, precio, activo) VALUES
    (1, 'Amoxil',     'Amoxicilina',  'Cápsulas',  '500 mg',  'Oral', 200, 1500,  TRUE),
    (1, 'Cipro',      'Ciprofloxacino','Tabletas', '500 mg',  'Oral', 150, 2200,  TRUE),
    (2, 'Dolex',      'Acetaminofén', 'Tabletas',  '500 mg',  'Oral', 500, 800,   TRUE),
    (2, 'Tramal',     'Tramadol',     'Cápsulas',  '50 mg',   'Oral', 100, 3500,  TRUE),
    (3, 'Tensoval',   'Losartán',     'Tabletas',  '50 mg',   'Oral', 180, 1200,  TRUE),
    (4, 'Glucofage',  'Metformina',   'Tabletas',  '850 mg',  'Oral', 300, 900,   TRUE),
    (5, 'Ibuprofeno', 'Ibuprofeno',   'Tabletas',  '400 mg',  'Oral', 400, 600,   TRUE);

-- ---------------------------------------------------------------------
-- CATEGORÍAS DE TRATAMIENTOS
-- ---------------------------------------------------------------------
INSERT INTO categoria_tratamiento (nombre, descripcion) VALUES
    ('Farmacológico',     'Tratamiento basado en medicamentos'),
    ('Físico',            'Fisioterapia y rehabilitación'),
    ('Quirúrgico',        'Tratamiento por intervención quirúrgica'),
    ('Nutricional',       'Plan de alimentación terapéutico'),
    ('Psicológico',       'Apoyo psicológico y terapia');

-- ---------------------------------------------------------------------
-- TRATAMIENTOS
-- ---------------------------------------------------------------------
INSERT INTO tratamiento (id_categoria, id_consulta, nombre, descripcion, duracion_dias, fecha_inicio, fecha_fin, estado) VALUES
    (1, 1, 'Control de diabetes',  'Metformina 850 mg c/12h por tiempo indefinido', 30,  CURRENT_DATE - 7, CURRENT_DATE + 23, 'activo'),
    (4, 1, 'Dieta hipoglucémica',  'Reducción de carbohidratos simples',            90,  CURRENT_DATE - 7, CURRENT_DATE + 83, 'activo'),
    (1, 3, 'Antibioticoterapia',   'Amoxicilina 500 mg c/8h x 7 días',              7,   CURRENT_DATE - 1, CURRENT_DATE + 6,  'activo');

-- ---------------------------------------------------------------------
-- ÓRDENES MÉDICAS
-- ---------------------------------------------------------------------
INSERT INTO orden_medica (id_consulta, id_medicamento, id_tratamiento, dosis, frecuencia, duracion, indicaciones) VALUES
    (1, 6, 1, '850 mg', 'Cada 12 horas', 'Indefinido', 'Tomar con alimentos. No suspender sin indicación médica.'),
    (1, 5, NULL, '50 mg',  'Cada 24 horas', 'Indefinido', 'Tomar en la mañana.'),
    (3, 1, 3, '500 mg', 'Cada 8 horas',  '7 días',     'Completar el tratamiento aunque mejoren los síntomas.'),
    (3, 3, NULL, '500 mg', 'Cada 6 horas si fiebre', '3 días', 'Solo en caso de fiebre o dolor.');

-- ---------------------------------------------------------------------
-- TIPOS DE PROCEDIMIENTO
-- ---------------------------------------------------------------------
INSERT INTO tipo_procedimiento (nombre, descripcion) VALUES
    ('Diagnóstico',  'Procedimiento para obtener un diagnóstico'),
    ('Terapéutico',  'Procedimiento para tratar una condición'),
    ('Preventivo',   'Procedimiento de prevención'),
    ('Quirúrgico',   'Procedimiento que requiere cirugía');

-- ---------------------------------------------------------------------
-- PROCEDIMIENTOS
-- ---------------------------------------------------------------------
INSERT INTO procedimiento (id_tipo, nombre, descripcion, costo, requiere_ayuno) VALUES
    (1, 'Hemograma completo',         'Análisis sanguíneo de rutina',     45000,  TRUE),
    (1, 'Electrocardiograma',         'Estudio eléctrico del corazón',    65000,  FALSE),
    (1, 'Radiografía de tórax',       'Imagen diagnóstica de pulmones',   80000,  FALSE),
    (2, 'Sutura simple',              'Cierre de herida con puntos',      55000,  FALSE),
    (2, 'Curación de herida',         'Limpieza y cobertura de herida',   25000,  FALSE),
    (4, 'Apendicectomía',             'Extirpación quirúrgica del apéndice', 1500000, TRUE),
    (4, 'Colecistectomía laparoscópica','Extracción de la vesícula',     2200000, TRUE);

-- ---------------------------------------------------------------------
-- CIRUGÍAS
-- ---------------------------------------------------------------------
INSERT INTO cirugia (id_paciente, id_medico, nombre, descripcion, fecha_programada, fecha_realizada, duracion_min, estado, observaciones) VALUES
    (4, 2, 'Apendicectomía urgente', 'Cirugía por apendicitis aguda',     NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 90,  'realizada',  'Sin complicaciones'),
    (3, 2, 'Colecistectomía',        'Cirugía programada por colelitiasis', NOW() + INTERVAL '15 days', NULL,                       NULL, 'programada', 'Pre-quirúrgico completo');

-- ---------------------------------------------------------------------
-- PROCEDIMIENTOS QUIRÚRGICOS
-- ---------------------------------------------------------------------
INSERT INTO procedimiento_quirurgico (id_cirugia, id_procedimiento, orden, notas) VALUES
    (1, 6, 1, 'Procedimiento principal'),
    (1, 5, 2, 'Curación post-operatoria'),
    (2, 7, 1, 'Procedimiento programado');

-- ---------------------------------------------------------------------
-- VACUNAS
-- ---------------------------------------------------------------------
INSERT INTO vacuna (id_paciente, nombre, dosis, fecha_aplicacion, lote, aplicada_por, observaciones) VALUES
    (5, 'COVID-19 (Pfizer)', 'Refuerzo',         CURRENT_DATE - 60, 'LT-PF-2024-0123', 3, 'Sin reacciones adversas'),
    (5, 'Influenza',         'Anual',            CURRENT_DATE - 30, 'LT-IF-2024-0456', 3, 'Aplicada en brazo izquierdo'),
    (1, 'Tétanos',           'Refuerzo 10 años', CURRENT_DATE - 90, 'LT-TT-2024-0789', 1, 'Aplicada por herida punzante'),
    (2, 'Hepatitis B',       '3ra dosis',        CURRENT_DATE - 15, 'LT-HB-2024-0321', 1, 'Esquema completo');

-- ---------------------------------------------------------------------
-- FACTURAS
-- ---------------------------------------------------------------------
INSERT INTO factura (id_paciente, id_consulta, numero_factura, subtotal, impuesto, total, estado, metodo_pago) VALUES
    (4, 1, 'FAC-2026-0001', 35000,  6650,  41650,   'pagada',    'Efectivo'),
    (5, 2, 'FAC-2026-0002', 50000,  9500,  59500,   'pagada',    'Tarjeta débito'),
    (1, 3, 'FAC-2026-0003', 120000, 22800, 142800,  'pagada',    'Transferencia'),
    (3, NULL, 'FAC-2026-0004', 90000,  17100, 107100,  'pendiente', NULL),
    (4, NULL, 'FAC-2026-0005', 1500000,285000,1785000, 'pendiente', NULL);

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Después de ejecutar, puedes correr:
-- SELECT 'persona' AS tabla, COUNT(*) FROM persona
-- UNION ALL SELECT 'usuario', COUNT(*) FROM usuario
-- UNION ALL SELECT 'paciente', COUNT(*) FROM paciente
-- UNION ALL SELECT 'medico', COUNT(*) FROM medico
-- UNION ALL SELECT 'cita', COUNT(*) FROM cita
-- UNION ALL SELECT 'consulta_medica', COUNT(*) FROM consulta_medica
-- UNION ALL SELECT 'diagnostico', COUNT(*) FROM diagnostico
-- UNION ALL SELECT 'medicamento', COUNT(*) FROM medicamento
-- UNION ALL SELECT 'orden_medica', COUNT(*) FROM orden_medica;
