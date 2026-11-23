-- España como país de la red: reglas y términos (RN-6, HU-36), pasarela y métodos de pago (RN-1, HU-19).
INSERT INTO regiones_reglas (pais, nombre, idioma, moneda, terminos_titulo, terminos) VALUES
('ES', 'España', 'es', 'EUR', 'Términos y protección de datos (España)',
 'Tus datos personales se tratan conforme al Reglamento General de Protección de Datos (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD). Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad. Los documentos de verificación se conservan cifrados. Las reservas y pagos se rigen por la ley española. (Texto de ejemplo.)')
ON CONFLICT (pais) DO NOTHING;

-- Bizum: pago con el número de móvil, muy usado en España (simulado como los demás).
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_check
  CHECK (metodo IN ('tarjeta', 'paypal', 'pse', 'nequi', 'spei', 'oxxo', 'pix', 'bizum'));

INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda, metodos) VALUES
  ('ES', 'España', 'redsys_simulada', 'EUR', ARRAY['tarjeta', 'bizum', 'paypal'])
ON CONFLICT (pais) DO NOTHING;
