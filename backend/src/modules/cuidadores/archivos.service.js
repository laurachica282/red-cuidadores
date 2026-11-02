import crypto from 'node:crypto';

// Los documentos de verificación se guardan cifrados (AES-256-GCM).
// La llave sale de ARCHIVOS_KEY; si no existe se usa JWT_SECRET.
const llave = () => {
  const base = process.env.ARCHIVOS_KEY || process.env.JWT_SECRET;
  if (!base) throw new Error('Falta ARCHIVOS_KEY o JWT_SECRET en el .env');
  return crypto.scryptSync(base, 'red-cuidadores-archivos', 32);
};

export function cifrar(buffer) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', llave(), iv);
  const datos = Buffer.concat([c.update(buffer), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]); // iv(12) + tag(16) + datos
}

export function descifrar(buffer) {
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const d = crypto.createDecipheriv('aes-256-gcm', llave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(buffer.subarray(28)), d.final()]);
}
