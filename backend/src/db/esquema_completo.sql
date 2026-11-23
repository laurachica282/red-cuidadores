-- Red de Cuidadores · estructura completa de la base de datos.
-- GENERADO por src/db/generar_esquema.js a partir de: 01_usuarios.sql, 02_codigos_verificacion.sql, 03_bloqueo_login.sql, 04_clave_cambiada.sql, 05_cuidadores.sql, 06_regiones.sql, 07_sesiones.sql, 08_dispositivos_confiables.sql, 09_mascotas.sql, 10_cuenta.sql, 11_login_social.sql, 11_ubicacion_cuidadores.sql, 12_servicios_cuidador.sql, 13_pasarelas_pais.sql, 14_pasarelas_br_us.sql, 15_reservas.sql, 16_seguimiento.sql, 17_pagos.sql, 18_metodos_pago.sql, 19_movimientos_pago.sql, 20_espana.sql.
-- No lo edites a mano: cambia el script numerado y vuelve a correr "npm run db:esquema".
-- Ejecútalo una sola vez sobre una base vacía (en Supabase: SQL Editor → pegar → Run).

-- ═════════════════════════════ 01_usuarios.sql ═════════════════════════════
CREATE TABLE IF NOT EXISTS usuarios (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre                VARCHAR(120) NOT NULL,
  correo                VARCHAR(160) NOT NULL UNIQUE,
  clave_hash            VARCHAR(100) NOT NULL,
  rol                   VARCHAR(20)  NOT NULL DEFAULT 'viajero'
                        CHECK (rol IN ('viajero', 'cuidador', 'admin')),
  telefono              VARCHAR(30),
  ciudad                VARCHAR(80),
  pais                  CHAR(2)      NOT NULL DEFAULT 'CO',
  idioma                VARCHAR(5)   NOT NULL DEFAULT 'es',
  moneda                CHAR(3)      NOT NULL DEFAULT 'COP',
  correo_verificado     BOOLEAN      NOT NULL DEFAULT FALSE,
  dos_pasos             BOOLEAN      NOT NULL DEFAULT FALSE,
  status                BOOLEAN      NOT NULL DEFAULT TRUE,
  motivo_desactivacion  TEXT,
  desactivado_en        TIMESTAMPTZ,
  creado_en             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ═════════════════════════════ 02_codigos_verificacion.sql ═════════════════════════════
CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proposito     VARCHAR(20)  NOT NULL
                CHECK (proposito IN ('registro', 'recuperacion', '2fa')),
  codigo_hash   VARCHAR(100) NOT NULL,
  expira_en     TIMESTAMPTZ  NOT NULL,
  intentos      SMALLINT     NOT NULL DEFAULT 0,
  usado         BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Buscar el código vigente más reciente de un usuario por propósito
CREATE INDEX IF NOT EXISTS idx_codigos_usuario_proposito
  ON codigos_verificacion (usuario_id, proposito, creado_en DESC);

-- ═════════════════════════════ 03_bloqueo_login.sql ═════════════════════════════
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta   TIMESTAMPTZ;

-- ═════════════════════════════ 04_clave_cambiada.sql ═════════════════════════════
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS clave_cambiada_en TIMESTAMPTZ;

-- ═════════════════════════════ 05_cuidadores.sql ═════════════════════════════
-- Módulo cuidadores (HU-10 a HU-14). Ejecutar después de 04_clave_cambiada.sql.
-- RN-5: ninguna fila se elimina, por eso no hay ON DELETE CASCADE.

-- HU-10: perfil del cuidador
CREATE TABLE IF NOT EXISTS perfiles_cuidador (
  usuario_id      BIGINT PRIMARY KEY REFERENCES usuarios(id),
  descripcion     TEXT,
  tarifa_noche    NUMERIC(12,2) NOT NULL CHECK (tarifa_noche > 0),
  tipos_mascota   TEXT[]        NOT NULL DEFAULT '{}',
  creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- HU-11 y HU-12: solicitudes de verificación de antecedentes
CREATE TABLE IF NOT EXISTS verificaciones_cuidador (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id      BIGINT       NOT NULL REFERENCES usuarios(id),
  estado          VARCHAR(20)  NOT NULL DEFAULT 'en_revision'
                  CHECK (estado IN ('en_revision', 'aprobado', 'rechazado')),
  acepta_datos    BOOLEAN      NOT NULL,
  motivo_rechazo  TEXT,
  revisado_por    BIGINT REFERENCES usuarios(id),   -- quién
  revisado_en     TIMESTAMPTZ,                      -- cuándo
  vence_en        TIMESTAMPTZ,                      -- HU-13: aprobación + 12 meses
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verificaciones_usuario
  ON verificaciones_cuidador (usuario_id, id DESC);

-- Fotos del espacio (públicas) y documentos de verificación (cifrados)
CREATE TABLE IF NOT EXISTS archivos_cuidador (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id       BIGINT       NOT NULL REFERENCES usuarios(id),
  verificacion_id  BIGINT REFERENCES verificaciones_cuidador(id),
  tipo             VARCHAR(20)  NOT NULL
                   CHECK (tipo IN ('foto_espacio', 'documento', 'selfie', 'antecedentes')),
  mime             VARCHAR(60)  NOT NULL,
  cifrado          BOOLEAN      NOT NULL DEFAULT FALSE,
  datos            BYTEA        NOT NULL,
  activo           BOOLEAN      NOT NULL DEFAULT TRUE,   -- quitar una foto solo la oculta
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- HU-14: registro de suspensiones
CREATE TABLE IF NOT EXISTS suspensiones_cuidador (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id      BIGINT      NOT NULL REFERENCES usuarios(id),
  motivo          TEXT        NOT NULL,
  suspendido_por  BIGINT      NOT NULL REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RN-3 y HU-13: un cuidador aparece en la búsqueda solo con perfil, cuenta activa
-- y antecedentes aprobados que no hayan vencido. Brayan (búsqueda) debe consultar ESTA vista.
CREATE OR REPLACE VIEW cuidadores_visibles AS
SELECT u.id            AS usuario_id,
       u.nombre,
       u.ciudad,
       u.pais,
       p.tarifa_noche,
       p.tipos_mascota,
       p.descripcion,
       TRUE            AS antecedentes_verificados,
       v.vence_en      AS antecedentes_vencen_en
FROM usuarios u
JOIN perfiles_cuidador p ON p.usuario_id = u.id
JOIN LATERAL (
  SELECT vence_en FROM verificaciones_cuidador
  WHERE usuario_id = u.id AND estado = 'aprobado' AND vence_en > NOW()
  ORDER BY vence_en DESC LIMIT 1
) v ON TRUE
WHERE u.rol = 'cuidador' AND u.status = TRUE;

-- ═════════════════════════════ 06_regiones.sql ═════════════════════════════
-- Módulo region (HU-34 y HU-36). Reglas y términos legales por país.
CREATE TABLE IF NOT EXISTS regiones_reglas (
  pais             CHAR(2)      PRIMARY KEY,
  nombre           VARCHAR(60)  NOT NULL,
  idioma           VARCHAR(5)   NOT NULL CHECK (idioma IN ('es', 'en', 'pt')),
  moneda           CHAR(3)      NOT NULL,
  terminos_titulo  VARCHAR(120) NOT NULL,
  terminos         TEXT         NOT NULL,
  activa           BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO regiones_reglas (pais, nombre, idioma, moneda, terminos_titulo, terminos) VALUES
('CO', 'Colombia', 'es', 'COP', 'Términos y protección de datos (Colombia)',
 'Tus datos personales se tratan conforme a la Ley 1581 de 2012 (habeas data). Puedes conocer, actualizar y rectificar tus datos. Los antecedentes del cuidador se usan solo para verificar su identidad y se conservan cifrados. Las reservas y pagos se rigen por la ley colombiana. (Texto de ejemplo: debe revisarlo un abogado.)'),
('MX', 'México', 'es', 'MXN', 'Términos y aviso de privacidad (México)',
 'Tus datos personales se tratan conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Puedes ejercer tus derechos ARCO. Los documentos de verificación se conservan cifrados. Las reservas y pagos se rigen por la ley mexicana. (Texto de ejemplo.)'),
('BR', 'Brasil', 'pt', 'BRL', 'Termos e proteção de dados (Brasil)',
 'Seus dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD). Você pode acessar, corrigir e solicitar informações sobre seus dados. Os documentos de verificação são guardados criptografados. As reservas e pagamentos seguem a lei brasileira. (Texto de exemplo.)'),
('US', 'United States', 'en', 'USD', 'Terms and privacy notice (United States)',
 'Your personal data is processed under applicable U.S. federal and state privacy laws. You may request access to or correction of your data. Verification documents are stored encrypted. Bookings and payments are governed by U.S. law. (Sample text.)')
ON CONFLICT (pais) DO NOTHING;

-- ═════════════════════════════ 07_sesiones.sql ═════════════════════════════
CREATE TABLE IF NOT EXISTS sesiones (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id        BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dispositivo       VARCHAR(80)  NOT NULL,
  user_agent        VARCHAR(500),
  ip                INET,
  ciudad            VARCHAR(120),
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ultima_actividad  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  cerrada_en        TIMESTAMPTZ
);

-- Las consultas siempre buscan las sesiones abiertas de un usuario.
CREATE INDEX IF NOT EXISTS sesiones_abiertas_idx
  ON sesiones (usuario_id) WHERE cerrada_en IS NULL;

-- ═════════════════════════════ 08_dispositivos_confiables.sql ═════════════════════════════
CREATE TABLE IF NOT EXISTS dispositivos_confiables (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id        BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dispositivo_hash  CHAR(64)     NOT NULL,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ultimo_uso        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, dispositivo_hash)
);

-- La verificación en dos pasos es obligatoria para cuidadores.
UPDATE usuarios SET dos_pasos = TRUE WHERE rol = 'cuidador';

-- ═════════════════════════════ 09_mascotas.sql ═════════════════════════════
-- Módulo mascotas (HU-23 y HU-24)
CREATE TABLE mascotas (
  id                   SERIAL PRIMARY KEY,
  usuario_id           BIGINT NOT NULL REFERENCES usuarios(id),
  nombre               VARCHAR(80) NOT NULL,
  especie              VARCHAR(30) NOT NULL,
  raza                 VARCHAR(80),
  edad_meses           INTEGER CHECK (edad_meses >= 0),
  peso_kg              NUMERIC(5,2) CHECK (peso_kg > 0),
  vacunas              TEXT,
  microchip            VARCHAR(40),
  indicaciones_medicas TEXT,
  foto_url             TEXT,
  es_fina              BOOLEAN NOT NULL DEFAULT false,
  valor_estimado       NUMERIC(12,2),
  comprobante_url      TEXT,
  status               BOOLEAN NOT NULL DEFAULT true,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fina_requiere_datos CHECK (
    es_fina = false OR (valor_estimado IS NOT NULL AND comprobante_url IS NOT NULL)
  )
);

CREATE INDEX idx_mascotas_usuario ON mascotas(usuario_id);

-- ═════════════════════════════ 10_cuenta.sql ═════════════════════════════
-- Módulo cuenta (Daniel Páez): HU-06, HU-09, HU-32, HU-33, HU-35, HU-37, HU-39, HU-40, HU-41.
-- Depende de 01_usuarios.sql. Es idempotente: se puede ejecutar más de una vez.
-- Lleva el número 10 para dejar libres los siguientes del módulo auth (05_sesiones, 2FA...).

BEGIN;

-- HU-09: foto de perfil. Guarda solo el nombre del archivo, no la ruta ni la URL.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255);

-- Mantiene actualizado "actualizado_en" sin depender de que cada consulta lo recuerde.
CREATE OR REPLACE FUNCTION tocar_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_actualizado_en ON usuarios;
CREATE TRIGGER trg_usuarios_actualizado_en
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

-- RN-5: ninguna fila de usuario se elimina. Cerrar la cuenta es status = false.
-- (TRUNCATE no dispara este trigger; solo se usa en la base de pruebas.)
CREATE OR REPLACE FUNCTION impedir_borrado_usuario() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Los usuarios no se eliminan: desactiva la cuenta con status = false (RN-5)'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_sin_borrado ON usuarios;
CREATE TRIGGER trg_usuarios_sin_borrado
  BEFORE DELETE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION impedir_borrado_usuario();

-- Códigos de 6 dígitos de un solo uso (HU-06 y HU-40). Se guarda el HMAC, nunca el código.
CREATE TABLE IF NOT EXISTS cuenta_codigos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id   BIGINT       NOT NULL REFERENCES usuarios(id),
  proposito    VARCHAR(20)  NOT NULL CHECK (proposito IN ('cambio_correo', 'reactivacion')),
  destino      VARCHAR(160) NOT NULL,   -- correo al que se envió el código
  codigo_hash  CHAR(64)     NOT NULL,
  intentos     SMALLINT     NOT NULL DEFAULT 0,
  expira_en    TIMESTAMPTZ  NOT NULL,
  usado_en     TIMESTAMPTZ,
  creado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cuenta_codigos_vigente
  ON cuenta_codigos (usuario_id, proposito, creado_en DESC);

-- HU-32 (mockup 16): dos listas independientes, "qué te avisamos" (eventos) y "por dónde" (canales).
-- Se avisa de un evento solo si el evento está activo Y por los canales activos. Solo se guarda lo que
-- el usuario cambió; el resto sale de los valores por defecto (config.js).
CREATE TABLE IF NOT EXISTS preferencias_notificacion (
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios(id),
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('evento', 'canal')),
  clave       VARCHAR(20) NOT NULL,
  activo      BOOLEAN     NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, tipo, clave),
  CHECK ((tipo = 'evento' AND clave IN ('reservas', 'reportes', 'mensajes', 'promociones'))
      OR (tipo = 'canal'  AND clave IN ('push', 'correo', 'sms')))
);

-- HU-33: una reseña por reserva. reserva_id no tiene FK porque la tabla de reservas
-- es del módulo de Laura; la reserva se valida contra ese módulo (ver integraciones.js).
CREATE TABLE IF NOT EXISTS resenas (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id   BIGINT      NOT NULL UNIQUE,
  autor_id     BIGINT      NOT NULL REFERENCES usuarios(id),
  cuidador_id  BIGINT      NOT NULL REFERENCES usuarios(id),
  calificacion SMALLINT    NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario   VARCHAR(1000),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (autor_id <> cuidador_id)
);
CREATE INDEX IF NOT EXISTS idx_resenas_cuidador ON resenas (cuidador_id, creado_en DESC);

-- HU-39, HU-40, HU-41: historial de desactivaciones y reactivaciones.
-- "origen" separa lo que hizo el usuario de una suspensión del administrador (HU-14):
-- una cuenta suspendida no puede reactivarse sola.
CREATE TABLE IF NOT EXISTS cuenta_eventos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios(id),
  evento      VARCHAR(15) NOT NULL CHECK (evento IN ('desactivada', 'reactivada')),
  origen      VARCHAR(10) NOT NULL DEFAULT 'usuario' CHECK (origen IN ('usuario', 'admin')),
  motivo      VARCHAR(30),
  detalle     VARCHAR(500),
  admin_id    BIGINT REFERENCES usuarios(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cuenta_eventos_usuario ON cuenta_eventos (usuario_id, creado_en DESC);

-- HU-41: historial de cuentas para reportes SIN datos personales. Las reservas, pagos y
-- reseñas se unen por usuario_id; nombre, correo y teléfono no salen de aquí.
CREATE OR REPLACE VIEW v_historial_cuentas AS
SELECT u.id                        AS usuario_id,
       u.rol,
       u.pais,
       u.status,
       u.creado_en,
       u.desactivado_en,
       u.motivo_desactivacion      AS motivo,
       COALESCE(e.desactivaciones, 0) AS desactivaciones,
       COALESCE(e.reactivaciones, 0)  AS reactivaciones
FROM usuarios u
LEFT JOIN (
  SELECT usuario_id,
         COUNT(*) FILTER (WHERE evento = 'desactivada') AS desactivaciones,
         COUNT(*) FILTER (WHERE evento = 'reactivada')  AS reactivaciones
  FROM cuenta_eventos
  GROUP BY usuario_id
) e ON e.usuario_id = u.id
WHERE u.status = FALSE OR e.usuario_id IS NOT NULL;

COMMIT;

-- ═════════════════════════════ 11_login_social.sql ═════════════════════════════
-- Login social (Diego García): Google ahora, Microsoft después.
-- Depende de 01_usuarios.sql y 02_codigos_verificacion.sql. Es idempotente: se puede ejecutar más de una vez.

BEGIN;

-- Las cuentas creadas con Google/Microsoft no tienen contraseña hasta que creen una.
ALTER TABLE usuarios ALTER COLUMN clave_hash DROP NOT NULL;

-- Identidad del proveedor (sub = id estable de la cuenta en Google/Microsoft).
-- Sin ON DELETE CASCADE: los usuarios no se eliminan (RN-5).
CREATE TABLE IF NOT EXISTS cuentas_sociales (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT       NOT NULL REFERENCES usuarios(id),
  proveedor   VARCHAR(20)  NOT NULL CHECK (proveedor IN ('google', 'microsoft')),
  sub         VARCHAR(255) NOT NULL,
  correo      VARCHAR(160),
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (proveedor, sub)
);
CREATE INDEX IF NOT EXISTS idx_cuentas_sociales_usuario ON cuentas_sociales (usuario_id);

-- Código por correo para confirmar cambios sensibles en cuentas sin contraseña.
ALTER TABLE codigos_verificacion DROP CONSTRAINT IF EXISTS codigos_verificacion_proposito_check;
ALTER TABLE codigos_verificacion ADD CONSTRAINT codigos_verificacion_proposito_check
  CHECK (proposito IN ('registro', 'recuperacion', '2fa', 'confirmacion'));

COMMIT;

-- ═════════════════════════════ 11_ubicacion_cuidadores.sql ═════════════════════════════
-- HU-15: ubicación del cuidador para buscar por cercanía y mostrarlo en el mapa.
-- El cuidador escribe su dirección; el mapa la ubica (Nominatim) y las coordenadas se guardan solas.
-- Columnas opcionales: un cuidador sin ubicación sigue saliendo en la búsqueda por ciudad.
-- La dirección es privada: al viajero solo se le muestra el barrio y un punto aproximado.
-- Tabla del módulo cuidadores (Vanesa); el perfil (HU-10) es quien las llena.

ALTER TABLE perfiles_cuidador
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(200),
  ADD COLUMN IF NOT EXISTS barrio    VARCHAR(80),
  ADD COLUMN IF NOT EXISTS latitud   NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitud  NUMERIC(9,6);

ALTER TABLE perfiles_cuidador DROP CONSTRAINT IF EXISTS perfiles_cuidador_coordenadas_validas;
ALTER TABLE perfiles_cuidador ADD CONSTRAINT perfiles_cuidador_coordenadas_validas CHECK (
  (latitud IS NULL AND longitud IS NULL)
  OR (latitud BETWEEN -90 AND 90 AND longitud BETWEEN -180 AND 180)
);

-- ═════════════════════════════ 12_servicios_cuidador.sql ═════════════════════════════
-- HU-15 y HU-16: servicios que ofrece cada cuidador, cada uno con su tarifa.
--   alojamiento (/noche), domicilio (/visita), paseo (/paseo), guarderia (/día).
-- Tabla del dominio cuidadores (Vanesa); los demás servicios los llena el perfil del cuidador (HU-10).
-- Depende de 05_cuidadores.sql. Es idempotente: se puede ejecutar más de una vez.
-- RN-5: ninguna fila se elimina; dejar de ofrecer un servicio es activo = false.

CREATE TABLE IF NOT EXISTS servicios_cuidador (
  usuario_id      BIGINT        NOT NULL REFERENCES usuarios(id),
  servicio        VARCHAR(20)   NOT NULL
                  CHECK (servicio IN ('alojamiento', 'domicilio', 'paseo', 'guarderia')),
  tarifa          NUMERIC(12,2) NOT NULL CHECK (tarifa > 0),
  activo          BOOLEAN       NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, servicio)
);

-- Búsqueda: filtrar cuidadores por el servicio que ofrecen
CREATE INDEX IF NOT EXISTS idx_servicios_cuidador_servicio
  ON servicios_cuidador (servicio);

-- Migración: cada perfil existente ofrece alojamiento con su tarifa_noche.
-- tarifa_noche se mantiene por compatibilidad con el módulo cuidadores (Vanesa);
-- la tarifa de 'alojamiento' debe coincidir con ella.
INSERT INTO servicios_cuidador (usuario_id, servicio, tarifa)
SELECT usuario_id, 'alojamiento', tarifa_noche
FROM perfiles_cuidador
ON CONFLICT (usuario_id, servicio) DO NOTHING;

-- ═════════════════════════════ 13_pasarelas_pais.sql ═════════════════════════════
-- HU-20: pasarela, moneda y comisión por país (RN-1)
CREATE TABLE IF NOT EXISTS pasarelas_pais (
  pais           CHAR(2)      PRIMARY KEY,
  nombre_pais    VARCHAR(60)  NOT NULL,
  pasarela       VARCHAR(40)  NOT NULL,
  moneda         CHAR(3)      NOT NULL,
  comision_pct   NUMERIC(5,2) NOT NULL DEFAULT 15.00
                 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  activa         BOOLEAN      NOT NULL DEFAULT TRUE,
  actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda) VALUES
  ('CO', 'Colombia', 'wompi_simulada',        'COP'),
  ('MX', 'México',   'mercadopago_simulada',  'MXN'),
  ('CL', 'Chile',    'webpay_simulada',       'CLP'),
  ('PE', 'Perú',     'culqi_simulada',        'PEN')
ON CONFLICT (pais) DO NOTHING;

-- ═════════════════════════════ 14_pasarelas_br_us.sql ═════════════════════════════
-- Alinea las pasarelas con los países de regiones_reglas (CO, MX, BR, US).
INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda) VALUES
  ('BR', 'Brasil',         'pagseguro_simulada', 'BRL'),
  ('US', 'Estados Unidos', 'stripe_simulada',    'USD')
ON CONFLICT (pais) DO NOTHING;

UPDATE pasarelas_pais SET activa = FALSE WHERE pais IN ('CL', 'PE');

-- ═════════════════════════════ 15_reservas.sql ═════════════════════════════
-- HU-17: solicitudes de reserva.
-- Ejecutar después de 09_mascotas.sql y 12_servicios_cuidador.sql.
-- RN-5: no se borran filas; una reserva solo cambia de estado.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS reservas (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viajero_id       BIGINT        NOT NULL REFERENCES usuarios(id),
  cuidador_id      BIGINT        NOT NULL REFERENCES usuarios(id),
  mascota_id       INTEGER       NOT NULL REFERENCES mascotas(id),
  servicio         VARCHAR(20)   NOT NULL
                   CHECK (servicio IN ('alojamiento', 'domicilio', 'paseo', 'guarderia')),
  fecha_inicio     DATE          NOT NULL,
  fecha_fin        DATE          NOT NULL,
  tarifa           NUMERIC(12,2) NOT NULL CHECK (tarifa > 0),
  moneda           CHAR(3)       NOT NULL,
  unidades         INTEGER       NOT NULL CHECK (unidades > 0),
  total            NUMERIC(12,2) NOT NULL CHECK (total > 0),
  estado           VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'vencida',
                                     'cancelada', 'en_curso', 'completada')),
  responder_antes  TIMESTAMPTZ   NOT NULL,
  respondida_en    TIMESTAMPTZ,
  motivo_rechazo   TEXT,
  nota             TEXT,
  creado_en        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin >= fecha_inicio),
  CHECK (viajero_id <> cuidador_id),
  -- Un cuidador no puede tener dos reservas confirmadas o en curso que se crucen.
  EXCLUDE USING gist (
    cuidador_id WITH =,
    daterange(fecha_inicio, fecha_fin, '[]') WITH &&
  ) WHERE (estado IN ('confirmada', 'en_curso'))
);

CREATE INDEX IF NOT EXISTS idx_reservas_viajero ON reservas (viajero_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_cuidador ON reservas (cuidador_id, estado);

-- ═════════════════════════════ 16_seguimiento.sql ═════════════════════════════
-- Seguimiento del servicio (Brayan Miranda): HU-30 reportes, HU-31 chat y HU-28 emergencia.
-- Ejecutar después de 15_reservas.sql. Idempotente.
-- RN-5: no se borran filas; los reportes, mensajes y alertas quedan como evidencia (HU-29, HU-41).

-- HU-30: el cuidador cuenta cómo va la mascota (al menos un reporte por día de servicio).
CREATE TABLE IF NOT EXISTS reportes_servicio (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id  BIGINT       NOT NULL REFERENCES reservas(id),
  autor_id    BIGINT       NOT NULL REFERENCES usuarios(id),
  titulo      VARCHAR(80)  NOT NULL,
  nota        VARCHAR(1000),
  foto_url    TEXT,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reportes_reserva ON reportes_servicio (reserva_id, creado_en DESC);

-- HU-31: chat de la reserva entre viajero y cuidador. Se cierra 7 días después del servicio.
CREATE TABLE IF NOT EXISTS mensajes_reserva (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id  BIGINT        NOT NULL REFERENCES reservas(id),
  autor_id    BIGINT        NOT NULL REFERENCES usuarios(id),
  texto       VARCHAR(1000) NOT NULL CHECK (length(trim(texto)) > 0),
  leido_en    TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mensajes_reserva ON mensajes_reserva (reserva_id, id);

-- HU-28: a quién avisar si algo pasa durante el servicio (uno por viajero).
CREATE TABLE IF NOT EXISTS contactos_emergencia (
  usuario_id      BIGINT       PRIMARY KEY REFERENCES usuarios(id),
  nombre          VARCHAR(120) NOT NULL,
  parentesco      VARCHAR(40),
  telefono        VARCHAR(30)  NOT NULL,
  correo          VARCHAR(160),
  actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- HU-28: veterinario de cada mascota. Tabla aparte para no tocar "mascotas" (módulo de Marcela).
CREATE TABLE IF NOT EXISTS veterinarios_mascota (
  mascota_id      INTEGER      PRIMARY KEY REFERENCES mascotas(id),
  nombre          VARCHAR(120) NOT NULL,
  clinica         VARCHAR(120),
  telefono        VARCHAR(30)  NOT NULL,
  direccion       VARCHAR(200),
  actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- HU-28: registro de cada vez que el viajero pulsa el botón de emergencia.
CREATE TABLE IF NOT EXISTS alertas_emergencia (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id        BIGINT       NOT NULL REFERENCES reservas(id),
  autor_id          BIGINT       NOT NULL REFERENCES usuarios(id),
  mensaje           VARCHAR(500) NOT NULL,
  avisado_contacto  BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alertas_reserva ON alertas_emergencia (reserva_id, creado_en DESC);

-- Notificaciones. Los avisos no se guardan: se arman con los reportes, mensajes, reservas y alertas que ya existen.
-- Dos estados distintos:
--   visto_hasta  → al abrir la bandeja la campana vuelve a 0 (los avisos posteriores cuentan como nuevos).
--   leído        → el aviso deja de verse resaltado cuando se toca (notificaciones_leidas)
--                  o cuando se marcan todas como leídas (leidas_hasta).
CREATE TABLE IF NOT EXISTS notificaciones_vistas (
  usuario_id   BIGINT       PRIMARY KEY REFERENCES usuarios(id),
  visto_hasta  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE notificaciones_vistas ADD COLUMN IF NOT EXISTS leidas_hasta TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS notificaciones_leidas (
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios(id),
  aviso_id    VARCHAR(40) NOT NULL,   -- id del aviso, p. ej. 'rep-12' o 'msj-40'
  leido_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, aviso_id)
);

-- ═════════════════════════════ 17_pagos.sql ═════════════════════════════
-- HU-18: pagos de las reservas (pasarela simulada).
-- Ejecutar después de 15_reservas.sql.
-- Cada pago guarda su propia pasarela, moneda y comisión (si el admin las cambia después, no altera lo ya cobrado).
CREATE TABLE IF NOT EXISTS pagos (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id        BIGINT        NOT NULL REFERENCES reservas(id),
  viajero_id        BIGINT        NOT NULL REFERENCES usuarios(id),
  cuidador_id       BIGINT        NOT NULL REFERENCES usuarios(id),
  pasarela          VARCHAR(40)   NOT NULL,
  moneda            CHAR(3)       NOT NULL,
  monto             NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  comision_pct      NUMERIC(5,2)  NOT NULL,
  comision          NUMERIC(12,2) NOT NULL,
  neto_cuidador     NUMERIC(12,2) NOT NULL,
  estado            VARCHAR(20)   NOT NULL
                    CHECK (estado IN ('retenido', 'liberado', 'reembolsado', 'fallido')),
  tarjeta_ultimos4  CHAR(4),
  referencia        VARCHAR(40)   NOT NULL,
  creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  liberado_en       TIMESTAMPTZ
);

-- Una reserva no puede tener dos pagos vigentes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_vigente_por_reserva
  ON pagos (reserva_id) WHERE estado IN ('retenido', 'liberado');
CREATE INDEX IF NOT EXISTS idx_pagos_viajero ON pagos (viajero_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_cuidador ON pagos (cuidador_id, estado);

-- ═════════════════════════════ 18_metodos_pago.sql ═════════════════════════════
-- Métodos de pago por país (todos simulados).
-- Ejecutar después de 17_pagos.sql.
ALTER TABLE pasarelas_pais ADD COLUMN IF NOT EXISTS metodos TEXT[] NOT NULL DEFAULT ARRAY['tarjeta'];

UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'pse', 'nequi']   WHERE pais = 'CO';
UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'spei', 'oxxo']   WHERE pais = 'MX';
UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'pix']            WHERE pais = 'BR';
UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'paypal']         WHERE pais = 'US';

-- Con qué método se hizo cada pago y una descripción segura para mostrarla (nunca el dato completo).
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS metodo VARCHAR(20) NOT NULL DEFAULT 'tarjeta'
  CHECK (metodo IN ('tarjeta', 'paypal', 'pse', 'nequi', 'spei', 'oxxo', 'pix'));
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS detalle VARCHAR(80);
UPDATE pagos SET detalle = 'Tarjeta ••••' || tarjeta_ultimos4 WHERE detalle IS NULL AND tarjeta_ultimos4 IS NOT NULL;

-- ═════════════════════════════ 19_movimientos_pago.sql ═════════════════════════════
-- HU-21 / HU-22: registro de cada movimiento de dinero de un pago.
--   cobro      el viajero paga (el dinero queda retenido)
--   reembolso  el viajero cancela y se le devuelve un porcentaje según la anticipación (HU-21)
--   liberacion el cuidador recibe su parte, ya descontada la comisión (HU-22)
-- RN-5: no se borran filas; es la evidencia de lo que pasó con el dinero.
CREATE TABLE IF NOT EXISTS movimientos_pago (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pago_id         BIGINT        NOT NULL REFERENCES pagos(id),
  reserva_id      BIGINT        NOT NULL REFERENCES reservas(id),
  tipo            VARCHAR(20)   NOT NULL CHECK (tipo IN ('cobro', 'reembolso', 'liberacion')),
  beneficiario_id BIGINT        NOT NULL REFERENCES usuarios(id),
  moneda          CHAR(3)       NOT NULL,
  monto           NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  porcentaje      NUMERIC(5,2),
  comision        NUMERIC(12,2) NOT NULL DEFAULT 0,
  detalle         TEXT,
  creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_pago ON movimientos_pago (pago_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_movimientos_beneficiario ON movimientos_pago (beneficiario_id, creado_en DESC);
-- Un pago se libera o se reembolsa una sola vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_movimiento_unico
  ON movimientos_pago (pago_id, tipo) WHERE tipo IN ('reembolso', 'liberacion');

-- Lo que se le devolvió al viajero (0 si no hubo reembolso).
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_reembolsado NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Pagos que ya existían: se registran su cobro y, si ya se liberaron, su liberación.
INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, comision, detalle, creado_en)
SELECT p.id, p.reserva_id, 'cobro', p.cuidador_id, p.moneda, p.monto, 100, 0, p.detalle, p.creado_en
  FROM pagos p
 WHERE p.estado IN ('retenido', 'liberado', 'reembolsado')
   AND NOT EXISTS (SELECT 1 FROM movimientos_pago m WHERE m.pago_id = p.id AND m.tipo = 'cobro');

INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, comision, detalle, creado_en)
SELECT p.id, p.reserva_id, 'liberacion', p.cuidador_id, p.moneda, p.neto_cuidador, 100 - p.comision_pct, p.comision,
       'Pago del servicio terminado', COALESCE(p.liberado_en, NOW())
  FROM pagos p
 WHERE p.estado = 'liberado'
   AND NOT EXISTS (SELECT 1 FROM movimientos_pago m WHERE m.pago_id = p.id AND m.tipo = 'liberacion');

-- ═════════════════════════════ 20_espana.sql ═════════════════════════════
-- España como país de la red: reglas y términos (RN-6, HU-36), pasarela y métodos de pago (RN-1, HU-19).
INSERT INTO regiones_reglas (pais, nombre, idioma, moneda, terminos_titulo, terminos) VALUES
('ES', 'España', 'es', 'EUR', 'Términos y protección de datos (España)',
 'Tus datos personales se tratan conforme al Reglamento General de Protección de Datos (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD). Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad. Los documentos de verificación se conservan cifrados. Las reservas y pagos se rigen por la ley española. (Texto de ejemplo.)')
ON CONFLICT (pais) DO NOTHING;

-- Bizum: pago con el número de móvil, muy usado en España (simulado como los demás).
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_check
  CHECK (metodo IN ('tarjeta', 'paypal', 'pse', 'nequi', 'spei', 'oxxo', 'pix', 'bizum'));

INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda, metodos) VALUES
  ('ES', 'España', 'redsys_simulada', 'EUR', ARRAY['tarjeta', 'bizum', 'paypal'])
ON CONFLICT (pais) DO NOTHING;
