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