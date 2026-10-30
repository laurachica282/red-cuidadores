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
