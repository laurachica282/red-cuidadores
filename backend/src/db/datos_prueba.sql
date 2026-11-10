-- Datos de prueba (solo desarrollo). NO es una migración: no lleva número a propósito.
-- Se ejecuta después de todos los scripts numerados (lo hace `npm run db:crear`).
-- Todas las cuentas usan la contraseña:  Prueba2026
-- Los cuidadores tienen 2FA obligatorio: el código sale en la consola del backend (SMTP sin configurar).

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM usuarios WHERE correo = 'admin@demo.com') THEN
    RAISE EXCEPTION 'Los datos de prueba ya están cargados (existe admin@demo.com)';
  END IF;
END $$;

-- Ayudas para referirse a filas por correo / nombre en vez de por id.
CREATE FUNCTION pg_temp.uid(c TEXT) RETURNS BIGINT
  LANGUAGE sql AS $$ SELECT id FROM usuarios WHERE correo = c $$;
CREATE FUNCTION pg_temp.mid(c TEXT, n TEXT) RETURNS INTEGER
  LANGUAGE sql AS $$ SELECT m.id FROM mascotas m JOIN usuarios u ON u.id = m.usuario_id
                     WHERE u.correo = c AND m.nombre = n $$;

/* ───────────── Usuarios ───────────── */
-- Hash bcrypt de "Prueba2026"
INSERT INTO usuarios (nombre, correo, clave_hash, rol, telefono, ciudad, pais, idioma, moneda,
                      correo_verificado, dos_pasos, creado_en)
SELECT x.nombre, x.correo, '$2b$10$W2gPJu8s/lm4TOIMP.A.Xe/GzLIt5zDzHMadf3PtxNYb.V66U0Or2',
       x.rol, x.telefono, x.ciudad, x.pais, x.idioma, x.moneda, TRUE, x.rol = 'cuidador',
       NOW() - (x.dias || ' days')::interval
FROM (VALUES
  -- admin
  ('Admin Red',          'admin@demo.com',     'admin',    '+57 300 000 0000', 'Bogotá',           'CO', 'es', 'COP', 400),
  -- viajeros
  ('Ana Torres',         'ana@demo.com',       'viajero',  '+57 301 111 1111', 'Bogotá',           'CO', 'es', 'COP', 200),
  ('Carlos Rojas',       'carlos@demo.com',    'viajero',  '+57 302 222 2222', 'Medellín',         'CO', 'es', 'COP', 150),
  ('Valentina Gómez',    'valentina@demo.com', 'viajero',  '+57 303 333 3333', 'Bogotá',           'CO', 'es', 'COP', 90),
  ('Sofía Hernández',    'sofia@demo.com',     'viajero',  '+52 55 1234 5678', 'Ciudad de México', 'MX', 'es', 'MXN', 60),
  ('John Smith',         'john@demo.com',      'viajero',  '+1 305 555 0101',  'Miami',            'US', 'en', 'USD', 30),
  -- cuidadores (Colombia)
  ('Laura Martínez',     'laura@demo.com',     'cuidador', '+57 310 444 4444', 'Bogotá',           'CO', 'es', 'COP', 380),
  ('Andrés Pérez',       'andres@demo.com',    'cuidador', '+57 311 555 5555', 'Bogotá',           'CO', 'es', 'COP', 300),
  ('Camila Ruiz',        'camila@demo.com',    'cuidador', '+57 312 666 6666', 'Bogotá',           'CO', 'es', 'COP', 250),
  ('Felipe Castro',      'felipe@demo.com',    'cuidador', '+57 313 777 7777', 'Bogotá',           'CO', 'es', 'COP', 120),
  ('Daniela Moreno',     'daniela@demo.com',   'cuidador', '+57 314 888 8888', 'Medellín',         'CO', 'es', 'COP', 220),
  ('Santiago López',     'santiago@demo.com',  'cuidador', '+57 315 999 9999', 'Medellín',         'CO', 'es', 'COP', 180),
  -- cuidador en revisión (NO aparece en la búsqueda)
  ('Julián Vargas',      'julian@demo.com',    'cuidador', '+57 316 000 1111', 'Bogotá',           'CO', 'es', 'COP', 5),
  -- cuidadores (México)
  ('Mariana Díaz',       'mariana@demo.com',   'cuidador', '+52 55 8765 4321', 'Ciudad de México', 'MX', 'es', 'MXN', 210),
  ('Diego Ramírez',      'diegor@demo.com',    'cuidador', '+52 55 2468 1357', 'Ciudad de México', 'MX', 'es', 'MXN', 100)
) AS x(nombre, correo, rol, telefono, ciudad, pais, idioma, moneda, dias);

-- Una cuenta desactivada (para probar HU-39 a HU-41)
INSERT INTO usuarios (nombre, correo, clave_hash, rol, ciudad, correo_verificado, status,
                      motivo_desactivacion, desactivado_en, creado_en)
VALUES ('Pedro Inactivo', 'pedro@demo.com', '$2b$10$W2gPJu8s/lm4TOIMP.A.Xe/GzLIt5zDzHMadf3PtxNYb.V66U0Or2',
        'viajero', 'Bogotá', TRUE, FALSE, 'ya_no_viajo', NOW() - INTERVAL '10 days', NOW() - INTERVAL '300 days');

INSERT INTO cuenta_eventos (usuario_id, evento, origen, motivo, detalle, creado_en)
VALUES (pg_temp.uid('pedro@demo.com'), 'desactivada', 'usuario', 'ya_no_viajo',
        'Ya no viajo tan seguido', NOW() - INTERVAL '10 days');

/* ───────────── Perfiles de cuidador ───────────── */
INSERT INTO perfiles_cuidador (usuario_id, descripcion, tarifa_noche, tipos_mascota, direccion, barrio, latitud, longitud)
SELECT pg_temp.uid(x.correo), x.descripcion, x.tarifa, x.tipos, x.direccion, x.barrio, x.lat, x.lng
FROM (VALUES
  ('laura@demo.com',
   'Veterinaria de profesión. Casa con patio grande y cerrado. Cuido máximo dos mascotas a la vez para darles atención total.',
   85000, ARRAY['perro','gato'], 'Calle 85 # 15-20', 'Chicó', 4.669800, -74.053600),
  ('andres@demo.com',
   'Amante de los perros grandes. Salgo a correr todas las mañanas y tu perro puede acompañarme. Apartamento cerca al Parque de la 93.',
   70000, ARRAY['perro'], 'Carrera 13 # 93-40', 'Chapinero Alto', 4.676500, -74.048500),
  ('camila@demo.com',
   'Tengo experiencia con gatos, aves y conejos. Ambiente tranquilo, sin niños ni otras mascotas. Envío fotos y videos todos los días.',
   60000, ARRAY['gato','ave','conejo'], 'Calle 63 # 9-15', 'Chapinero', 4.648300, -74.062800),
  ('felipe@demo.com',
   'Estudiante de zootecnia. Disponible fines de semana y vacaciones. Paseos largos por el Parque Simón Bolívar.',
   45000, ARRAY['perro','gato','otro'], 'Calle 53 # 45-10', 'Teusaquillo', 4.639100, -74.083400),
  ('daniela@demo.com',
   'Casa campestre en El Poblado con zona verde. Me encantan los perros mayores y los que necesitan medicación.',
   90000, ARRAY['perro','gato'], 'Carrera 43A # 10-50', 'El Poblado', 6.208800, -75.567500),
  ('santiago@demo.com',
   'Cuidador de tiempo completo. Trabajo desde casa, así que tu mascota nunca se queda sola.',
   55000, ARRAY['perro','gato','conejo'], 'Calle 33 # 70-20', 'Laureles', 6.245000, -75.590300),
  ('julian@demo.com',
   'Recién llegado a la red. Tengo dos perros propios muy sociables.',
   50000, ARRAY['perro'], 'Calle 140 # 11-30', 'Cedritos', 4.721700, -74.039500),
  ('mariana@demo.com',
   'Departamento amplio en la Condesa, a dos cuadras del Parque México. Ideal para perros pequeños y gatos.',
   450, ARRAY['perro','gato'], 'Av. Ámsterdam 120', 'Condesa', 19.411900, -99.170800),
  ('diegor@demo.com',
   'Paseador profesional con 5 años de experiencia. Grupos pequeños, máximo 3 perros.',
   380, ARRAY['perro'], 'Calle Orizaba 80', 'Roma Norte', 19.418400, -99.160000)
) AS x(correo, descripcion, tarifa, tipos, direccion, barrio, lat, lng);

/* ───────────── Servicios y tarifas ───────────── */
INSERT INTO servicios_cuidador (usuario_id, servicio, tarifa)
SELECT pg_temp.uid(x.correo), x.servicio, x.tarifa
FROM (VALUES
  ('laura@demo.com',    'alojamiento', 85000), ('laura@demo.com',    'domicilio', 40000), ('laura@demo.com',    'guarderia', 55000),
  ('andres@demo.com',   'alojamiento', 70000), ('andres@demo.com',   'paseo',     20000),
  ('camila@demo.com',   'alojamiento', 60000), ('camila@demo.com',   'domicilio', 35000),
  ('felipe@demo.com',   'alojamiento', 45000), ('felipe@demo.com',   'paseo',     15000), ('felipe@demo.com',   'guarderia', 35000),
  ('daniela@demo.com',  'alojamiento', 90000), ('daniela@demo.com',  'guarderia', 60000),
  ('santiago@demo.com', 'alojamiento', 55000), ('santiago@demo.com', 'domicilio', 30000), ('santiago@demo.com', 'paseo', 18000),
  ('julian@demo.com',   'alojamiento', 50000),
  ('mariana@demo.com',  'alojamiento',   450), ('mariana@demo.com',  'domicilio',   250),
  ('diegor@demo.com',   'alojamiento',   380), ('diegor@demo.com',   'paseo',       120)
) AS x(correo, servicio, tarifa);

/* ───────────── Verificación de antecedentes ───────────── */
INSERT INTO verificaciones_cuidador (usuario_id, estado, acepta_datos, revisado_por, revisado_en, vence_en, creado_en)
SELECT pg_temp.uid(c), 'aprobado', TRUE, pg_temp.uid('admin@demo.com'),
       NOW() - INTERVAL '30 days', NOW() + INTERVAL '11 months', NOW() - INTERVAL '32 days'
FROM unnest(ARRAY['laura@demo.com','andres@demo.com','camila@demo.com','felipe@demo.com',
                  'daniela@demo.com','santiago@demo.com','mariana@demo.com','diegor@demo.com']) AS c;

INSERT INTO verificaciones_cuidador (usuario_id, estado, acepta_datos, creado_en)
VALUES (pg_temp.uid('julian@demo.com'), 'en_revision', TRUE, NOW() - INTERVAL '2 days');

/* ───────────── Mascotas ───────────── */
INSERT INTO mascotas (usuario_id, nombre, especie, raza, edad_meses, peso_kg, vacunas, microchip, indicaciones_medicas)
SELECT pg_temp.uid(x.correo), x.nombre, x.especie, x.raza, x.edad, x.peso, x.vacunas, x.chip, x.indicaciones
FROM (VALUES
  ('ana@demo.com',       'Luna',    'perro',  'Golden Retriever', 36, 28.50, 'Rabia, parvovirus, moquillo (al día)', '985112003456789', NULL),
  ('ana@demo.com',       'Michi',   'gato',   'Criollo',          24,  4.20, 'Triple felina, rabia',                 NULL,              NULL),
  ('carlos@demo.com',    'Rocky',   'perro',  'Bulldog Francés',  48, 12.00, 'Rabia, parvovirus',                    '985112009876543', 'Problemas respiratorios: evitar ejercicio intenso con calor.'),
  ('valentina@demo.com', 'Coco',    'ave',    'Cacatúa',          60,  0.45, NULL,                                   NULL,              NULL),
  ('valentina@demo.com', 'Tambor',  'conejo', 'Mini Lop',         18,  1.80, 'Mixomatosis',                          NULL,              'Dieta de heno y verduras, nada de pan.'),
  ('sofia@demo.com',     'Canela',  'perro',  'Chihuahua',        30,  2.50, 'Rabia, séxtuple',                      NULL,              NULL),
  ('john@demo.com',      'Max',     'perro',  'Labrador',         72, 32.00, 'Rabies, DHPP',                         '900123456789012', 'Takes arthritis medication with dinner.')
) AS x(correo, nombre, especie, raza, edad, peso, vacunas, chip, indicaciones);

/* ───────────── Reservas ───────────── */
-- unidades: alojamiento = noches; los demás servicios = días (noches + 1).
INSERT INTO reservas (viajero_id, cuidador_id, mascota_id, servicio, fecha_inicio, fecha_fin,
                      tarifa, moneda, unidades, total, estado, responder_antes, respondida_en, nota, creado_en)
SELECT pg_temp.uid(x.viajero), pg_temp.uid(x.cuidador), pg_temp.mid(x.viajero, x.mascota), x.servicio,
       CURRENT_DATE + x.ini, CURRENT_DATE + x.fin, x.tarifa, x.moneda, x.unidades, x.tarifa * x.unidades,
       x.estado,
       CASE WHEN x.estado = 'pendiente' THEN NOW() + INTERVAL '20 hours'
            ELSE NOW() + (x.ini - 7 || ' days')::interval END,
       CASE WHEN x.estado IN ('pendiente', 'vencida') THEN NULL
            ELSE NOW() + (x.ini - 6 || ' days')::interval END,
       x.nota,
       NOW() + (x.ini - 7 || ' days')::interval
FROM (VALUES
  -- completadas (pasadas): tienen reseña
  ('ana@demo.com',       'laura@demo.com',    'Luna',   'alojamiento', -60, -55, 85000, 'COP', 5, 'completada', 'Come dos veces al día.'),
  ('ana@demo.com',       'camila@demo.com',   'Michi',  'alojamiento', -40, -37, 60000, 'COP', 3, 'completada', NULL),
  ('carlos@demo.com',    'daniela@demo.com',  'Rocky',  'alojamiento', -30, -26, 90000, 'COP', 4, 'completada', 'Ojo con el calor.'),
  ('valentina@demo.com', 'camila@demo.com',   'Coco',   'domicilio',   -25, -23, 35000, 'COP', 3, 'completada', NULL),
  ('carlos@demo.com',    'santiago@demo.com', 'Rocky',  'alojamiento', -20, -18, 55000, 'COP', 2, 'completada', NULL),
  ('ana@demo.com',       'andres@demo.com',   'Luna',   'paseo',       -15, -14, 20000, 'COP', 2, 'completada', NULL),
  ('sofia@demo.com',     'mariana@demo.com',  'Canela', 'alojamiento', -35, -30,   450, 'MXN', 5, 'completada', NULL),
  ('valentina@demo.com', 'felipe@demo.com',   'Tambor', 'guarderia',   -12, -12, 35000, 'COP', 1, 'completada', NULL),
  -- en curso
  ('ana@demo.com',       'laura@demo.com',    'Michi',  'alojamiento',  -1,   3, 85000, 'COP', 4, 'en_curso',   NULL),
  -- confirmadas (futuras)
  ('carlos@demo.com',    'daniela@demo.com',  'Rocky',  'alojamiento',  10,  14, 90000, 'COP', 4, 'confirmada', 'Viaje de trabajo.'),
  ('valentina@demo.com', 'camila@demo.com',   'Tambor', 'alojamiento',  20,  25, 60000, 'COP', 5, 'confirmada', NULL),
  -- pendientes (el cuidador debe responder en 24 h)
  ('ana@demo.com',       'andres@demo.com',   'Luna',   'alojamiento',  15,  20, 70000, 'COP', 5, 'pendiente',  'Luna es muy juguetona.'),
  ('valentina@demo.com', 'laura@demo.com',    'Coco',   'domicilio',    30,  32, 40000, 'COP', 3, 'pendiente',  NULL),
  ('sofia@demo.com',     'diegor@demo.com',   'Canela', 'paseo',         5,   7,   120, 'MXN', 3, 'pendiente',  NULL),
  -- otros estados
  ('carlos@demo.com',    'felipe@demo.com',   'Rocky',  'alojamiento',   8,  10, 45000, 'COP', 2, 'rechazada',  NULL),
  ('ana@demo.com',       'santiago@demo.com', 'Michi',  'alojamiento',  40,  42, 55000, 'COP', 2, 'cancelada',  NULL)
) AS x(viajero, cuidador, mascota, servicio, ini, fin, tarifa, moneda, unidades, estado, nota);

UPDATE reservas SET motivo_rechazo = 'No tengo disponibilidad en esas fechas'
WHERE estado = 'rechazada';

/* ───────────── Reseñas (solo de reservas completadas) ───────────── */
INSERT INTO resenas (reserva_id, autor_id, cuidador_id, calificacion, comentario, creado_en)
SELECT r.id, r.viajero_id, r.cuidador_id, x.calificacion, x.comentario,
       (r.fecha_fin + 1)::timestamptz
FROM reservas r
JOIN mascotas m ON m.id = r.mascota_id
JOIN usuarios c ON c.id = r.cuidador_id
JOIN (VALUES
  ('laura@demo.com',    'Luna',   5, 'Laura es increíble. Me mandaba fotos todos los días y Luna volvió feliz.'),
  ('camila@demo.com',   'Michi',  5, 'Michi estuvo muy tranquilo. Súper recomendada para gatos.'),
  ('daniela@demo.com',  'Rocky',  4, 'Muy atenta con la medicación de Rocky. La casa es hermosa.'),
  ('camila@demo.com',   'Coco',   5, 'Sabe mucho de aves, Coco la adora.'),
  ('santiago@demo.com', 'Rocky',  4, 'Buen cuidador, muy puntual en la entrega.'),
  ('andres@demo.com',   'Luna',   3, 'Los paseos estuvieron bien, aunque un poco cortos.'),
  ('mariana@demo.com',  'Canela', 5, '¡Excelente! Canela no quería regresar a casa.'),
  ('felipe@demo.com',   'Tambor', 4, 'Muy responsable para ser estudiante. Tambor comió bien.')
) AS x(cuidador, mascota, calificacion, comentario)
  ON x.cuidador = c.correo AND x.mascota = m.nombre
WHERE r.estado = 'completada';

/* ───────────── Preferencias de notificación (algunas cambiadas) ───────────── */
INSERT INTO preferencias_notificacion (usuario_id, tipo, clave, activo) VALUES
  (pg_temp.uid('ana@demo.com'),    'evento', 'promociones', FALSE),
  (pg_temp.uid('ana@demo.com'),    'canal',  'sms',         FALSE),
  (pg_temp.uid('carlos@demo.com'), 'canal',  'push',        FALSE);

COMMIT;
