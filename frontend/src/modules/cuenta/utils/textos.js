// Textos de la interfaz del módulo. Los códigos coinciden con los del backend (config.js).

export const MOTIVOS = [
  { valor: 'ya_no_uso', titulo: 'Ya no uso la red' },
  { valor: 'privacidad', titulo: 'Por privacidad' },
  { valor: 'mala_experiencia', titulo: 'Tuve una mala experiencia' },
  { valor: 'encontre_alternativa', titulo: 'Encontré otra alternativa' },
  { valor: 'otro', titulo: 'Otro motivo' },
];

export const ETIQUETA_MOTIVO = {
  ...Object.fromEntries(MOTIVOS.map((m) => [m.valor, m.titulo])),
  suspension: 'Suspendida por un administrador',
};

// Notificaciones (mockup 16): "Qué te avisamos" y "Por dónde".
export const EVENTOS = [
  { valor: 'reservas', titulo: 'Reservas', desc: 'Confirmaciones, cambios y recordatorios.' },
  { valor: 'reportes', titulo: 'Reportes del cuidador', desc: 'Fotos y novedades de tu mascota.' },
  { valor: 'mensajes', titulo: 'Mensajes', desc: 'Cuando alguien te escribe en el chat.' },
  { valor: 'promociones', titulo: 'Promociones', desc: 'Descuentos y novedades de la red.' },
];

export const CANALES = [
  { valor: 'push', titulo: 'Notificaciones en el teléfono' },
  { valor: 'correo', titulo: 'Correo electrónico' },
  { valor: 'sms', titulo: 'Mensaje de texto (SMS)' },
];

// "Antes de irte" (mockup 18): una línea por verificación de paz y salvo (RN-4).
export const PAZ_Y_SALVO = {
  reservas_activas: {
    ok: 'No tienes reservas activas.',
    pendiente: (n) => `Tienes ${n} ${n === 1 ? 'reserva activa' : 'reservas activas'}: debes terminarla o cancelarla primero.`,
  },
  pagos_pendientes: {
    ok: 'No tienes pagos pendientes.',
    pendiente: (n) => `Tienes ${n} ${n === 1 ? 'pago pendiente' : 'pagos pendientes'}: se completan antes de cerrar la cuenta.`,
  },
  disputas_abiertas: {
    ok: 'No tienes disputas abiertas.',
    pendiente: (n) => `Tienes ${n} ${n === 1 ? 'disputa abierta' : 'disputas abiertas'}: debe resolverse antes de irte.`,
  },
  saldo_sin_liquidar: {
    ok: 'No tienes saldo por liquidar.',
    pendiente: () => 'Tienes saldo sin liquidar: espera a que se complete el pago.',
  },
};

// 42 -> "0:42" (cuenta regresiva del reenvío de códigos).
export const minutosYSegundos = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const NOMBRES_CALIFICACION = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

export const ETIQUETA_ROL = { viajero: 'Viajero', cuidador: 'Cuidador', admin: 'Administrador' };

const formato = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
export const fecha = (iso) => (iso ? formato.format(new Date(iso)) : '—');
