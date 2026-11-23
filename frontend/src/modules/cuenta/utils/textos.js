// Claves de texto de la interfaz del módulo (se traducen con t() en cada pantalla; ver ../i18n.js).
// Los códigos coinciden con los del backend (config.js). Este archivo no importa nada para que las
// pruebas con node lo puedan cargar.

const MOTIVOS_CODIGOS = ['ya_no_uso', 'privacidad', 'mala_experiencia', 'encontre_alternativa', 'otro'];
export const MOTIVOS = MOTIVOS_CODIGOS.map((valor) => ({ valor, titulo: `cuenta.motivo.${valor}` }));

// Código de motivo -> clave de texto.
export const ETIQUETA_MOTIVO = {
  ...Object.fromEntries(MOTIVOS.map((m) => [m.valor, m.titulo])),
  suspension: 'cuenta.motivo.suspension',
};

// Notificaciones (mockup 16): "Qué te avisamos" y "Por dónde".
export const EVENTOS = ['reservas', 'reportes', 'mensajes', 'promociones']
  .map((valor) => ({ valor, titulo: `cuenta.evento.${valor}`, desc: `cuenta.evento.${valor}.desc` }));

export const CANALES = ['push', 'correo', 'sms'].map((valor) => ({ valor, titulo: `cuenta.canal.${valor}` }));

// "Antes de irte" (mockup 18): una línea por verificación de paz y salvo (RN-4).
// ok: clave cuando no hay nada pendiente; pendiente(n): clave en singular o plural (se usa con { n }).
const paz = (codigo) => ({
  ok: `cuenta.paz.${codigo}.ok`,
  pendiente: (n) => `cuenta.paz.${codigo}.${n === 1 ? 'uno' : 'varios'}`,
});
export const PAZ_Y_SALVO = {
  reservas_activas: paz('reservas_activas'),
  pagos_pendientes: paz('pagos_pendientes'),
  disputas_abiertas: paz('disputas_abiertas'),
  saldo_sin_liquidar: paz('saldo_sin_liquidar'),
};

// 42 -> "0:42" (cuenta regresiva del reenvío de códigos).
export const minutosYSegundos = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Claves de los nombres de calificación, de 1 a 5 estrellas.
export const NOMBRES_CALIFICACION = [1, 2, 3, 4, 5].map((n) => `cuenta.calif.${n}`);

// Código de rol -> clave de texto.
export const ETIQUETA_ROL = { viajero: 'cuenta.rol.viajero', cuidador: 'cuenta.rol.cuidador', admin: 'cuenta.rol.admin' };

// Fecha corta en el locale del idioma actual (las pantallas pasan el locale de useIdioma).
export const fecha = (iso, locale = 'es-CO') =>
  (iso ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso)) : '—');
