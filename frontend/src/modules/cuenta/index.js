// Lo único que el resto de la app debe importar del módulo cuenta.
export { publicRoutes, privateRoutes } from './routes.jsx';

// Para otros módulos:
//  - formatearPrecio(valor, moneda): da formato de precio en la moneda del usuario (HU-35).
//  - rutaNuevaResena(reservaId): enlace a la pantalla de calificar una reserva terminada (HU-33).
//  - RUTAS.configuracion: la pantalla de Configuración (mockup 11), para enlazarla desde el perfil o el inicio.
//  - RUTAS.reactivar: pantalla pública para volver a una cuenta desactivada (HU-40), para enlazarla desde el login.
export { formatearPrecio } from './utils/moneda.js';
export { RUTAS, rutaNuevaResena } from './rutas.js';
