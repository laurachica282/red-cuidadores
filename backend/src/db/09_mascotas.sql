-- Módulo mascotas (HU-23 y HU-24)
CREATE TABLE mascotas (
  id                   SERIAL PRIMARY KEY,
  usuario_id           BIGINT NOT NULL REFERENCES usuarios(id),
  nombre               VARCHAR(80) NOT NULL,
  especie              VARCHAR(30) NOT NULL,
  raza                 VARCHAR(80),
  edad_meses           INTEGER CHECK (edad_meses >= 0),
  peso_kg              NUMERIC(5,2) CHECK (peso_kg > 0),
  vacunas              TEXT,
  microchip            VARCHAR(40),
  indicaciones_medicas TEXT,
  foto_url             TEXT,
  es_fina              BOOLEAN NOT NULL DEFAULT false,
  valor_estimado       NUMERIC(12,2),
  comprobante_url      TEXT,
  status               BOOLEAN NOT NULL DEFAULT true,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fina_requiere_datos CHECK (
    es_fina = false OR (valor_estimado IS NOT NULL AND comprobante_url IS NOT NULL)
  )
);

CREATE INDEX idx_mascotas_usuario ON mascotas(usuario_id);