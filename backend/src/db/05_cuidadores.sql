-- Módulo cuidadores (HU-10 a HU-14). Ejecutar después de 04_clave_cambiada.sql.
-- RN-5: ninguna fila se elimina, por eso no hay ON DELETE CASCADE.

-- HU-10: perfil del cuidador
CREATE TABLE IF NOT EXISTS perfiles_cuidador (
  usuario_id      BIGINT PRIMARY KEY REFERENCES usuarios(id),
  descripcion     TEXT,
  tarifa_noche    NUMERIC(12,2) NOT NULL CHECK (tarifa_noche > 0),
  tipos_mascota   TEXT[]        NOT NULL DEFAULT '{}',
  creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- HU-11 y HU-12: solicitudes de verificación de antecedentes
CREATE TABLE IF NOT EXISTS verificaciones_cuidador (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id      BIGINT       NOT NULL REFERENCES usuarios(id),
  estado          VARCHAR(20)  NOT NULL DEFAULT 'en_revision'
                  CHECK (estado IN ('en_revision', 'aprobado', 'rechazado')),
  acepta_datos    BOOLEAN      NOT NULL,
  motivo_rechazo  TEXT,
  revisado_por    BIGINT REFERENCES usuarios(id),   -- quién
  revisado_en     TIMESTAMPTZ,                      -- cuándo
  vence_en        TIMESTAMPTZ,                      -- HU-13: aprobación + 12 meses
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verificaciones_usuario
  ON verificaciones_cuidador (usuario_id, id DESC);

-- Fotos del espacio (públicas) y documentos de verificación (cifrados)
CREATE TABLE IF NOT EXISTS archivos_cuidador (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id       BIGINT       NOT NULL REFERENCES usuarios(id),
  verificacion_id  BIGINT REFERENCES verificaciones_cuidador(id),
  tipo             VARCHAR(20)  NOT NULL
                   CHECK (tipo IN ('foto_espacio', 'documento', 'selfie', 'antecedentes')),
  mime             VARCHAR(60)  NOT NULL,
  cifrado          BOOLEAN      NOT NULL DEFAULT FALSE,
  datos            BYTEA        NOT NULL,
  activo           BOOLEAN      NOT NULL DEFAULT TRUE,   -- quitar una foto solo la oculta
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- HU-14: registro de suspensiones
CREATE TABLE IF NOT EXISTS suspensiones_cuidador (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id      BIGINT      NOT NULL REFERENCES usuarios(id),
  motivo          TEXT        NOT NULL,
  suspendido_por  BIGINT      NOT NULL REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RN-3 y HU-13: un cuidador aparece en la búsqueda solo con perfil, cuenta activa
-- y antecedentes aprobados que no hayan vencido. Brayan (búsqueda) debe consultar ESTA vista.
CREATE OR REPLACE VIEW cuidadores_visibles AS
SELECT u.id            AS usuario_id,
       u.nombre,
       u.ciudad,
       u.pais,
       p.tarifa_noche,
       p.tipos_mascota,
       p.descripcion,
       TRUE            AS antecedentes_verificados,
       v.vence_en      AS antecedentes_vencen_en
FROM usuarios u
JOIN perfiles_cuidador p ON p.usuario_id = u.id
JOIN LATERAL (
  SELECT vence_en FROM verificaciones_cuidador
  WHERE usuario_id = u.id AND estado = 'aprobado' AND vence_en > NOW()
  ORDER BY vence_en DESC LIMIT 1
) v ON TRUE
WHERE u.rol = 'cuidador' AND u.status = TRUE;
