-- Domicilio, paseo y guardería se cobran por hora; alojamiento sigue por noche (shared/servicios.js).
-- La reserva por horas es de un solo día, con hora de inicio y de fin (horas enteras).
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS hora_inicio TIME;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS hora_fin TIME;

-- Tramo de tiempo que ocupa la reserva: alojamiento, los días completos; por horas, solo esas horas.
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS periodo TSRANGE GENERATED ALWAYS AS (
  tsrange(
    fecha_inicio + COALESCE(hora_inicio, TIME '00:00'),
    CASE WHEN hora_fin IS NULL THEN (fecha_fin + 1)::timestamp ELSE fecha_fin + hora_fin END,
    '[)'
  )
) STORED;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_horas_validas') THEN
    ALTER TABLE reservas ADD CONSTRAINT reservas_horas_validas CHECK (
      (hora_inicio IS NULL) = (hora_fin IS NULL)
      AND (hora_inicio IS NULL OR (fecha_fin = fecha_inicio AND hora_fin > hora_inicio))
    );
  END IF;
  -- Antes se cruzaban días completos; ahora se cruzan tramos: dos paseos el mismo día a horas distintas sí caben.
  ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_cuidador_id_daterange_excl;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_sin_cruce') THEN
    ALTER TABLE reservas ADD CONSTRAINT reservas_sin_cruce
      EXCLUDE USING gist (cuidador_id WITH =, periodo WITH &&)
      WHERE (estado IN ('confirmada', 'en_curso'));
  END IF;
END $$;

COMMENT ON COLUMN servicios_cuidador.tarifa IS 'alojamiento: por noche; domicilio, paseo y guardería: por hora';
