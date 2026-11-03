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
