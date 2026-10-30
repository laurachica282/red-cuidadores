// Lo único que el resto de la app debe importar del módulo cuenta.
export { publicRoutes, privateRoutes } from './routes.jsx';

// Para otros módulos:
//  - formatearPrecio(valor, moneda): da formato de precio en la moneda del usuario (HU-35).
//  - rutaResena(reservaId): enlace a la pantalla de calificar una reserva terminada (HU-33).
//  - RUTA_REACTIVAR: pantalla pública para volver a una cuenta desactivada (HU-40).
export { formatearPrecio } from './utils/moneda.js';
export const rutaResena = (reservaId) => `/cuenta/resenas/nueva/${reservaId}`;
export const RUTA_CUENTA = '/cuenta';
export const RUTA_REACTIVAR = '/reactivar';
