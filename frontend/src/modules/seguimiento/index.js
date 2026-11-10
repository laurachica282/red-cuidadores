export { privateRoutes } from './routes.jsx';
// Campana de notificaciones (inicio y reservas).
export { default as Campana } from './components/Campana.jsx';
// HU-28: botón de emergencia para cada reserva en curso de la lista de reservas.
export { default as BotonEmergencia } from './components/BotonEmergencia.jsx';
// Para que la lista de reservas muestre la fase, el día del servicio y los mensajes sin leer.
export { historial as resumenReservas } from './services/seguimientoService.js';
