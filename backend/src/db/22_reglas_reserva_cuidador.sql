-- Reglas de reservas y del cuidador (revisión de producto, nov 2026). Solo agrega: no borra datos.
-- 1. Varias mascotas en una misma reserva.
-- 2. El cuidador puede tener reservas que se cruzan (él decide qué acepta).
-- 3. Plazo para pagar una reserva confirmada.
-- 4. El cuidador puede cancelar una reserva aceptada; el administrador decide si hay multa.
-- 5. Días en que el cuidador no está disponible.
-- 6. A dónde se le paga al cuidador.

-- 1. Mascotas de cada reserva. reservas.mascota_id se conserva como la mascota principal.
CREATE TABLE IF NOT EXISTS reserva_mascotas (
  reserva_id  BIGINT  NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  mascota_id  INTEGER NOT NULL REFERENCES mascotas(id),
  PRIMARY KEY (reserva_id, mascota_id)
);
CREATE INDEX IF NOT EXISTS idx_reserva_mascotas_mascota ON reserva_mascotas (mascota_id);
INSERT INTO reserva_mascotas (reserva_id, mascota_id)
SELECT id, mascota_id FROM reservas
ON CONFLICT DO NOTHING;

-- 2. Sin límite de reservas a la vez: se quitan las restricciones de exclusión por cuidador.
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_sin_cruce;
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_cuidador_id_daterange_excl;

-- 3. Plazo para pagar: se fija al confirmar (24 h o el inicio, lo que llegue primero).
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS pagar_antes TIMESTAMPTZ;

-- 4. Cancelación por parte del cuidador. El viajero recibe el 100 %; el administrador revisa el motivo.
CREATE TABLE IF NOT EXISTS cancelaciones_cuidador (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id      BIGINT        NOT NULL UNIQUE REFERENCES reservas(id),
  cuidador_id     BIGINT        NOT NULL REFERENCES usuarios(id),
  motivo          VARCHAR(30)   NOT NULL
                  CHECK (motivo IN ('enfermedad', 'emergencia_familiar', 'emergencia_mascota', 'fuerza_mayor', 'otro')),
  detalle         VARCHAR(500)  NOT NULL,
  estado          VARCHAR(20)   NOT NULL DEFAULT 'en_revision'
                  CHECK (estado IN ('en_revision', 'sin_multa', 'con_multa')),
  multa           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (multa >= 0),
  moneda          CHAR(3)       NOT NULL,
  nota_admin      VARCHAR(500),
  revisado_por    BIGINT        REFERENCES usuarios(id),
  revisado_en     TIMESTAMPTZ,
  -- La multa se descuenta del siguiente pago que se le libera al cuidador.
  descontada_en   TIMESTAMPTZ,
  descontada_pago BIGINT        REFERENCES pagos(id),
  creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cancel_cuidador_estado ON cancelaciones_cuidador (estado, creado_en);
CREATE INDEX IF NOT EXISTS idx_cancel_cuidador_cuidador ON cancelaciones_cuidador (cuidador_id);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS multa_descontada NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 5. Días no disponibles del cuidador (vacaciones, compromisos).
CREATE TABLE IF NOT EXISTS dias_no_disponibles (
  cuidador_id  BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dia          DATE        NOT NULL,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cuidador_id, dia)
);

-- 6. Datos de cobro del cuidador (cuenta bancaria o billetera digital del país).
CREATE TABLE IF NOT EXISTS datos_cobro (
  usuario_id      BIGINT       PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('cuenta_bancaria', 'billetera')),
  titular         VARCHAR(120) NOT NULL,
  documento       VARCHAR(30)  NOT NULL,
  entidad         VARCHAR(60)  NOT NULL,
  tipo_cuenta     VARCHAR(20)  CHECK (tipo_cuenta IN ('ahorros', 'corriente')),
  numero          VARCHAR(40)  NOT NULL,
  actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
