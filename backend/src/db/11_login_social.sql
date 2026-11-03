-- Login social (Diego García): Google ahora, Microsoft después.
-- Depende de 01_usuarios.sql y 02_codigos_verificacion.sql. Es idempotente: se puede ejecutar más de una vez.

BEGIN;

-- Las cuentas creadas con Google/Microsoft no tienen contraseña hasta que creen una.
ALTER TABLE usuarios ALTER COLUMN clave_hash DROP NOT NULL;

-- Identidad del proveedor (sub = id estable de la cuenta en Google/Microsoft).
-- Sin ON DELETE CASCADE: los usuarios no se eliminan (RN-5).
CREATE TABLE IF NOT EXISTS cuentas_sociales (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT       NOT NULL REFERENCES usuarios(id),
  proveedor   VARCHAR(20)  NOT NULL CHECK (proveedor IN ('google', 'microsoft')),
  sub         VARCHAR(255) NOT NULL,
  correo      VARCHAR(160),
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (proveedor, sub)
);
CREATE INDEX IF NOT EXISTS idx_cuentas_sociales_usuario ON cuentas_sociales (usuario_id);

-- Código por correo para confirmar cambios sensibles en cuentas sin contraseña.
ALTER TABLE codigos_verificacion DROP CONSTRAINT IF EXISTS codigos_verificacion_proposito_check;
ALTER TABLE codigos_verificacion ADD CONSTRAINT codigos_verificacion_proposito_check
  CHECK (proposito IN ('registro', 'recuperacion', '2fa', 'confirmacion'));

COMMIT;
