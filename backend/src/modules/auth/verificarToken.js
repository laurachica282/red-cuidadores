import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';

const sesionCerrada = (res) =>
  res.status(401).json({
    error: 'Tu sesión se cerró porque cambió la contraseña. Inicia sesión de nuevo.',
    codigo: 'SESION_CERRADA',
  });

// Protege rutas: exige un token de sesión vigente y posterior al último cambio de clave.
// Deja { id, rol } en req.usuario.
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

  try {
    // Se compara en segundos enteros: iat no tiene fracción y un login en el mismo segundo del cambio debe pasar.
    const r = await pool.query(
      `SELECT status, FLOOR(EXTRACT(EPOCH FROM clave_cambiada_en))::bigint AS cambio FROM usuarios WHERE id = $1`,
      [payload.id]
    );
    const u = r.rows[0];
    if (!u || !u.status) return res.status(401).json({ error: 'Tu sesión no es válida o venció' });
    if (u.cambio !== null && payload.iat < Number(u.cambio)) return sesionCerrada(res);

    req.usuario = { id: payload.id, rol: payload.rol };
    next();
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo validar la sesión' });
  }
}
