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
