import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../../db.js';

export const MAX_INTENTOS = 5;
export const ESPERA_REENVIO_SEG = 60;

// Invalida los códigos vigentes del mismo propósito y crea uno nuevo (válido 10 minutos).
// Devuelve el código en claro solo para enviarlo; en la base queda su hash.
export async function crearCodigo(usuarioId, proposito) {
  const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const hash = await bcrypt.hash(codigo, 10);

  await pool.query(
    'UPDATE codigos_verificacion SET usado = TRUE WHERE usuario_id = $1 AND proposito = $2 AND usado = FALSE',
    [usuarioId, proposito]
  );
  await pool.query(
    `INSERT INTO codigos_verificacion (usuario_id, proposito, codigo_hash, expira_en)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [usuarioId, proposito, hash]
  );
  return codigo;
}

// Resultado: { ok: true } o { ok: false, motivo: 'invalido'|'vencido'|'intentos', intentosRestantes? }
export async function verificarCodigo(usuarioId, proposito, codigo) {
  const r = await pool.query(
    `SELECT id, codigo_hash, intentos, expira_en > NOW() AS vigente
       FROM codigos_verificacion
      WHERE usuario_id = $1 AND proposito = $2 AND usado = FALSE
      ORDER BY creado_en DESC LIMIT 1`,
    [usuarioId, proposito]
  );
  const c = r.rows[0];
  if (!c) return { ok: false, motivo: 'vencido' };
  if (!c.vigente) return { ok: false, motivo: 'vencido' };
  if (c.intentos >= MAX_INTENTOS) return { ok: false, motivo: 'intentos' };

  if (!(await bcrypt.compare(codigo, c.codigo_hash))) {
    await pool.query('UPDATE codigos_verificacion SET intentos = intentos + 1 WHERE id = $1', [c.id]);
    const restantes = MAX_INTENTOS - (c.intentos + 1);
    return restantes > 0
      ? { ok: false, motivo: 'invalido', intentosRestantes: restantes }
      : { ok: false, motivo: 'intentos' };
  }

  await pool.query('UPDATE codigos_verificacion SET usado = TRUE WHERE id = $1', [c.id]);
  return { ok: true };
}

// Segundos que faltan para poder reenviar (0 si ya se puede). El cálculo se hace en SQL.
export async function segundosParaReenviar(usuarioId, proposito) {
  const r = await pool.query(
    `SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (creado_en + make_interval(secs => $3) - NOW()))))::int AS faltan
       FROM codigos_verificacion
      WHERE usuario_id = $1 AND proposito = $2
      ORDER BY creado_en DESC LIMIT 1`,
    [usuarioId, proposito, ESPERA_REENVIO_SEG]
  );
  return r.rows[0]?.faltan ?? 0;
}
