import { pool as poolPorDefecto } from '../../db.js';
import { crearAutenticacion } from './autenticar.js';
import { crearCodigos } from './codigos.js';
import { crearCorreo } from './correo.js';
import { crearRouter } from './cuenta.routes.js';
import { crearAlmacenFotos } from './fotos.js';
import { crearIntegraciones } from './integraciones.js';
import { crearAdminService } from './services/admin.service.js';
import { crearCierreService } from './services/cierre.service.js';
import { crearCorreoService } from './services/correo.service.js';
import { crearNotificacionesService } from './services/notificaciones.service.js';
import { crearPerfilService } from './services/perfil.service.js';
import { crearRegionService } from './services/region.service.js';
import { crearResenasService } from './services/resenas.service.js';

// Arma el módulo con sus dependencias. Todo es inyectable para poder probarlo con una
// base de pruebas, un correo falso y los límites de intentos apagados.
export function crearModuloCuenta({
  pool = poolPorDefecto,
  correo = crearCorreo(),
  fotos = crearAlmacenFotos(),
  integraciones = crearIntegraciones(),
  limites,
  log = console,
} = {}) {
  const codigos = crearCodigos(pool);
  const servicios = {
    perfil: crearPerfilService({ pool, fotos, codigos }),
    correo: crearCorreoService({ pool, codigos, correo }),
    notificaciones: crearNotificacionesService({ pool }),
    region: crearRegionService({ pool }),
    resenas: crearResenasService({ pool, integraciones }),
    cierre: crearCierreService({ pool, codigos, correo, integraciones, log }),
    admin: crearAdminService({ pool }),
  };
  const router = crearRouter({
    servicios,
    autenticacion: crearAutenticacion(pool),
    fotos,
    ...(limites !== undefined && { limites }),
  });
  return { router, servicios, integraciones };
}
