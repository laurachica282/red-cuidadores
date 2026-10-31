-- Módulo region (HU-34 y HU-36). Reglas y términos legales por país.
CREATE TABLE IF NOT EXISTS regiones_reglas (
  pais             CHAR(2)      PRIMARY KEY,
  nombre           VARCHAR(60)  NOT NULL,
  idioma           VARCHAR(5)   NOT NULL CHECK (idioma IN ('es', 'en', 'pt')),
  moneda           CHAR(3)      NOT NULL,
  terminos_titulo  VARCHAR(120) NOT NULL,
  terminos         TEXT         NOT NULL,
  activa           BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO regiones_reglas (pais, nombre, idioma, moneda, terminos_titulo, terminos) VALUES
('CO', 'Colombia', 'es', 'COP', 'Términos y protección de datos (Colombia)',
 'Tus datos personales se tratan conforme a la Ley 1581 de 2012 (habeas data). Puedes conocer, actualizar y rectificar tus datos. Los antecedentes del cuidador se usan solo para verificar su identidad y se conservan cifrados. Las reservas y pagos se rigen por la ley colombiana. (Texto de ejemplo: debe revisarlo un abogado.)'),
('MX', 'México', 'es', 'MXN', 'Términos y aviso de privacidad (México)',
 'Tus datos personales se tratan conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Puedes ejercer tus derechos ARCO. Los documentos de verificación se conservan cifrados. Las reservas y pagos se rigen por la ley mexicana. (Texto de ejemplo.)'),
('BR', 'Brasil', 'pt', 'BRL', 'Termos e proteção de dados (Brasil)',
 'Seus dados pessoais são tratados conforme a Lei Geral de Proteção de Dados (LGPD). Você pode acessar, corrigir e solicitar informações sobre seus dados. Os documentos de verificação são guardados criptografados. As reservas e pagamentos seguem a lei brasileira. (Texto de exemplo.)'),
('US', 'United States', 'en', 'USD', 'Terms and privacy notice (United States)',
 'Your personal data is processed under applicable U.S. federal and state privacy laws. You may request access to or correction of your data. Verification documents are stored encrypted. Bookings and payments are governed by U.S. law. (Sample text.)')
ON CONFLICT (pais) DO NOTHING;
