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