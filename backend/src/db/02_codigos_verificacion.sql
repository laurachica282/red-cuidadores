CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proposito     VARCHAR(20)  NOT NULL
                CHECK (proposito IN ('registro', 'recuperacion', '2fa')),
  codigo_hash   VARCHAR(100) NOT NULL,
  expira_en     TIMESTAMPTZ  NOT NULL,
  intentos      SMALLINT     NOT NULL DEFAULT 0,
  usado         BOOLEAN      NOT NULL DEFAULT FALSE,
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Buscar el código vigente más reciente de un usuario por propósito
CREATE INDEX IF NOT EXISTS idx_codigos_usuario_proposito
  ON codigos_verificacion (usuario_id, proposito, creado_en DESC);
