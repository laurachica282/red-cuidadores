// Rutas de pantalla del módulo cuenta, en un solo lugar. Cuelgan de /configuracion, igual que
// /configuracion/cambiar-clave del módulo auth. (Las rutas de la API, /api/cuenta/..., son otra cosa.)
export const RUTAS = {
  configuracion: '/configuracion',
  datos: '/configuracion/datos',
  correo: '/configuracion/correo',
  notificaciones: '/configuracion/notificaciones',
  region: '/configuracion/region',
  resenas: '/configuracion/resenas',
  nuevaResenaPatron: '/configuracion/resenas/nueva/:reservaId',
  desactivar: '/configuracion/desactivar',
  cuentasDesactivadas: '/configuracion/admin/desactivadas',
  // HU-40: pública, porque una cuenta desactivada no tiene sesión.
  reactivar: '/reactivar',
  // Son del módulo auth (HU-05, HU-07/08); aquí solo se enlazan.
  cambiarClave: '/configuracion/cambiar-clave',
  seguridad: '/configuracion/seguridad',
};

export const rutaNuevaResena = (reservaId) => `/configuracion/resenas/nueva/${reservaId}`;
