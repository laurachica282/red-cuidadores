import { registrarIntegraciones } from './integracion.js';

registrarIntegraciones();

export { default } from './pagos.routes.js';
// El ciclo de reservas libera el pago cuando el servicio termina (HU-22).
export { liberarCompletadas } from './pagos.service.js';
// HU-21: el módulo reservas cancela y pagos devuelve el dinero según la política.
// Si cancela el cuidador, se devuelve todo (reembolsarTodo).
export { POLITICA, aplicarCancelacion, cotizarCancelacion, reembolsarTodo } from './reembolsos.js';
