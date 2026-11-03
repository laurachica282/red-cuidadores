import { pool } from '../../db.js';

const COLUMNAS = 'pais, nombre_pais, pasarela, moneda, comision_pct, activa, actualizado_en';

export async function listar() {
  const r = await pool.query(`SELECT ${COLUMNAS} FROM pasarelas_pais ORDER BY nombre_pais`);
  return r.rows;
}

export async function obtener(pais) {
  const r = await pool.query(`SELECT ${COLUMNAS} FROM pasarelas_pais WHERE pais = $1`, [pais]);
  return r.rows[0] ?? null;
}

// Crea el país o actualiza su configuración (HU-20).
export async function guardar(pais, d) {
  const r = await pool.query(
    `INSERT INTO pasarelas_pais (pais, nombre_pais, pasarela, moneda, comision_pct, activa)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (pais) DO UPDATE SET
       nombre_pais = EXCLUDED.nombre_pais,
       pasarela = EXCLUDED.pasarela,
       moneda = EXCLUDED.moneda,
       comision_pct = EXCLUDED.comision_pct,
       activa = EXCLUDED.activa,
       actualizado_en = NOW()
     RETURNING ${COLUMNAS}`,
    [pais, d.nombre_pais, d.pasarela, d.moneda, d.comision_pct, d.activa]
  );
  return r.rows[0];
}