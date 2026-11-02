CREATE TABLE IF NOT EXISTS sesiones (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id        BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dispositivo       VARCHAR(80)  NOT NULL,
  user_agent        VARCHAR(500),
  ip                INET,
  ciudad            VARCHAR(120),
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ultima_actividad  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  cerrada_en        TIMESTAMPTZ
);

-- Las consultas siempre buscan las sesiones abiertas de un usuario.
CREATE INDEX IF NOT EXISTS sesiones_abiertas_idx
  ON sesiones (usuario_id) WHERE cerrada_en IS NULL;
