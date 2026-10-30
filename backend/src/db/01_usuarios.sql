CREATE TABLE IF NOT EXISTS usuarios (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre                VARCHAR(120) NOT NULL,
  correo                VARCHAR(160) NOT NULL UNIQUE,
  clave_hash            VARCHAR(100) NOT NULL,
  rol                   VARCHAR(20)  NOT NULL DEFAULT 'viajero'
                        CHECK (rol IN ('viajero', 'cuidador', 'admin')),
  telefono              VARCHAR(30),
  ciudad                VARCHAR(80),
  pais                  CHAR(2)      NOT NULL DEFAULT 'CO',
  idioma                VARCHAR(5)   NOT NULL DEFAULT 'es',
  moneda                CHAR(3)      NOT NULL DEFAULT 'COP',
  correo_verificado     BOOLEAN      NOT NULL DEFAULT FALSE,
  dos_pasos             BOOLEAN      NOT NULL DEFAULT FALSE,
  status                BOOLEAN      NOT NULL DEFAULT TRUE,
  motivo_desactivacion  TEXT,
  desactivado_en        TIMESTAMPTZ,
  creado_en             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);