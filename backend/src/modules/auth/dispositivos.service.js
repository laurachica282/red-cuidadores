import crypto from 'node:crypto';
import { pool } from '../../db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SHA-256 del dispositivoId que genera el frontend; null si no es un UUID. En la base nunca queda el id en claro.
export function hashDispositivo(id) {
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  return crypto.createHash('sha256').update(id.toLowerCase()).digest('hex');
}

// true si el usuario ya confirmó este dispositivo; de paso registra el uso.
export async function esConfiable(usuarioId, hash) {
  const r = await pool.query(
    'UPDATE dispositivos_confiables SET ultimo_uso = NOW() WHERE usuario_id = $1 AND dispositivo_hash = $2',
    [usuarioId, hash]
  );
  return r.rowCount > 0;
}

export async function confiarDispositivo(usuarioId, hash) {
  await pool.query(
    `INSERT INTO dispositivos_confiables (usuario_id, dispositivo_hash) VALUES ($1, $2)
     ON CONFLICT (usuario_id, dispositivo_hash) DO UPDATE SET ultimo_uso = NOW()`,
    [usuarioId, hash]
  );
}

// Tras restablecer la clave o desactivar la verificación, todo equipo vuelve a pedir código.
export async function olvidarDispositivos(usuarioId) {
  await pool.query('DELETE FROM dispositivos_confiables WHERE usuario_id = $1', [usuarioId]);
}
