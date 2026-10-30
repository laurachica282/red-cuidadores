import jwt from 'jsonwebtoken';
import { ErrorHttp } from './errores.js';

// Verifica el token del login y confirma contra la base que la cuenta sigue activa.
// Así una cuenta desactivada (HU-39) pierde todas sus sesiones al instante, aunque el
// JWT no haya vencido, y un cambio de rol se nota sin esperar a que el token se renueve.
export function crearAutenticacion(pool) {
  const requerirSesion = async (req, res, next) => {
    const [esquema, token] = (req.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) throw new ErrorHttp(401, 'Inicia sesión para continuar');

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new ErrorHttp(401, 'Tu sesión venció. Inicia sesión de nuevo');
    }

    const r = await pool.query('SELECT id, rol, status FROM usuarios WHERE id = $1', [payload.id]);
    const u = r.rows[0];
    if (!u || !u.status) throw new ErrorHttp(401, 'Esta sesión ya no es válida');

    req.usuario = { id: u.id, rol: u.rol };
    next();
  };

  const requerirRol = (...roles) => (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) throw new ErrorHttp(403, 'No tienes permiso para esto');
    next();
  };

  return { requerirSesion, requerirRol };
}
