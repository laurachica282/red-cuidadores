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
