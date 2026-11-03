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
