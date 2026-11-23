// Módulo cuidadores: lo que otros módulos pueden usar de él.
// server.js sigue importando cuidadores.routes.js directamente.
import { pool } from '../../db.js';

export { default } from './cuidadores.routes.js';

// Días (YYYY-MM-DD) que el cuidador marcó como no disponibles dentro de [desde, hasta].
export async function diasNoDisponiblesEntre(cuidadorId, desde, hasta) {
  const r = await pool.query(
    `SELECT to_char(dia, 'YYYY-MM-DD') AS dia FROM dias_no_disponibles
     WHERE cuidador_id = $1 AND dia BETWEEN $2::date AND $3::date ORDER BY dia`,
    [cuidadorId, desde, hasta]
  );
  return r.rows.map((x) => x.dia);
}
