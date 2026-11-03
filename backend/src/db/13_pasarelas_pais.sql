-- HU-20: pasarela, moneda y comisión por país (RN-1)
CREATE TABLE IF NOT EXISTS pasarelas_pais (
  pais           CHAR(2)      PRIMARY KEY,
  nombre_pais    VARCHAR(60)  NOT NULL,
  pasarela       VARCHAR(40)  NOT NULL,
  moneda         CHAR(3)      NOT NULL,
  comision_pct   NUMERIC(5,2) NOT NULL DEFAULT 15.00
                 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  activa         BOOLEAN      NOT NULL DEFAULT TRUE,
  actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda) VALUES
  ('CO', 'Colombia', 'wompi_simulada',        'COP'),
  ('MX', 'México',   'mercadopago_simulada',  'MXN'),
  ('CL', 'Chile',    'webpay_simulada',       'CLP'),
  ('PE', 'Perú',     'culqi_simulada',        'PEN')
ON CONFLICT (pais) DO NOTHING;