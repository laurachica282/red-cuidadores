// Lo único que el resto del backend debe importar del módulo cuenta.
import { crearModuloCuenta } from './modulo.js';

const modulo = crearModuloCuenta();

export default modulo.router;

// Puntos de unión para otros módulos (ver integraciones.js y el README de esta carpeta).
export const integraciones = modulo.integraciones;
export const canalesActivos = modulo.servicios.notificaciones.canalesActivos;
export const suspenderCuenta = modulo.servicios.cierre.suspender;

export { crearModuloCuenta };
