-- Métodos de pago por país (todos simulados).
-- Ejecutar después de 17_pagos.sql.
ALTER TABLE pasarelas_pais ADD COLUMN IF NOT EXISTS metodos TEXT[] NOT NULL DEFAULT ARRAY['tarjeta'];

UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'pse', 'nequi']   WHERE pais = 'CO';
UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'spei', 'oxxo']   WHERE pais = 'MX';
UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'pix']            WHERE pais = 'BR';
UPDATE pasarelas_pais SET metodos = ARRAY['tarjeta', 'paypal']         WHERE pais = 'US';

-- Con qué método se hizo cada pago y una descripción segura para mostrarla (nunca el dato completo).
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS metodo VARCHAR(20) NOT NULL DEFAULT 'tarjeta'
  CHECK (metodo IN ('tarjeta', 'paypal', 'pse', 'nequi', 'spei', 'oxxo', 'pix'));
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS detalle VARCHAR(80);
UPDATE pagos SET detalle = 'Tarjeta ••••' || tarjeta_ultimos4 WHERE detalle IS NULL AND tarjeta_ultimos4 IS NOT NULL;