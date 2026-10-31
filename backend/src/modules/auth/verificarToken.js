import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';

const sesionCerrada = (res) =>
  res.status(401).json({
    error: 'Tu sesión se cerró. Inicia sesión de nuevo.',
    codigo: 'SESION_CERRADA',
  });

// Protege rutas: exige un token de sesión vigente, con su sesión abierta y posterior al último cambio de clave.
// Deja { id, rol, sid } en req.usuario.
export async function verificarToken(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Tu sesión no es válida o venció' });
  }
  // Los tokens con propósito (p. ej. 'restablecer') no son de sesión.
  if (payload.proposito) return res.status(401).json({ error: 'Tu sesión no es válida o venció' });
  // Tokens emitidos antes de que existieran las sesiones: hay que volver a ingresar.
  if (!payload.sid) return sesionCerrada(res);

  try {
    // Se compara en segundos enteros: iat no tiene fracción y un login en el mismo segundo del cambio debe pasar.
    const r = await pool.query(
      `SELECT u.status, FLOOR(EXTRACT(EPOCH FROM u.clave_cambiada_en))::bigint AS cambio,
              s.id AS sid, s.cerrada_en IS NOT NULL AS cerrada,
              s.ultima_actividad < NOW() - INTERVAL '1 minute' AS refrescar
         FROM usuarios u
         LEFT JOIN sesiones s ON s.id = $2 AND s.usuario_id = u.id
        WHERE u.id = $1`,
      [payload.id, payload.sid]
    );
    const u = r.rows[0];
    if (!u || !u.status) return res.status(401).json({ error: 'Tu sesión no es válida o venció' });
    if (!u.sid || u.cerrada) return sesionCerrada(res);
    if (u.cambio !== null && payload.iat < Number(u.cambio)) return sesionCerrada(res);

    // Se actualiza como mucho una vez por minuto para no escribir en cada petición.
    if (u.refrescar) {
      await pool.query('UPDATE sesiones SET ultima_actividad = NOW() WHERE id = $1', [payload.sid]);
    }

    req.usuario = { id: payload.id, rol: payload.rol, sid: payload.sid };
    next();
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo validar la sesión' });
  }
}
