-- Alinea las pasarelas con los países de regiones_reglas (CO, MX, BR, US).
INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda) VALUES
  ('BR', 'Brasil',         'pagseguro_simulada', 'BRL'),
  ('US', 'Estados Unidos', 'stripe_simulada',    'USD')
ON CONFLICT (pais) DO NOTHING;

UPDATE pasarelas_pais SET activa = FALSE WHERE pais IN ('CL', 'PE');