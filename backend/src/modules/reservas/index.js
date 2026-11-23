import { registrarIntegraciones } from './integracion.js';
import { iniciarReloj } from './ciclo.js';

registrarIntegraciones();
iniciarReloj();

// Para que otros módulos (seguimiento) vean los estados al día antes de leer.
export { actualizarEstados } from './ciclo.js';

export { default } from './reservas.routes.js';