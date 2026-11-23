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
