import { verificarToken } from '../auth/verificarToken.js';
import { ErrorHttp } from './errores.js';

// La sesión la valida UNA sola pieza: verificarToken del módulo auth. Así las reglas de sesión
// (token de propósito, cambio de contraseña, y con HU-08 las sesiones cerradas por dispositivo)
// valen igual aquí sin duplicarlas. Esa pieza ya rechaza las cuentas con status = false, por eso
// una cuenta desactivada (HU-39) pierde la sesión al instante.
//
// Lo único propio: el rol se lee de la base, no del token, para que quitarle el rol de
// administrador a alguien surta efecto en la siguiente petición y no cuando venza su token.
export function crearAutenticacion(pool) {
  const requerirSesion = verificarToken;

  const requerirRol = (...roles) => async (req, res, next) => {
    const r = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!roles.includes(r.rows[0]?.rol)) throw new ErrorHttp(403, 'No tienes permiso para esto');
    next();
  };

  return { requerirSesion, requerirRol };
}
