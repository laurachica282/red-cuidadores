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

export const EVENTOS = [
  { valor: 'reservas', titulo: 'Reservas', desc: 'Solicitudes, confirmaciones y cambios' },
  { valor: 'reportes', titulo: 'Reportes del servicio', desc: 'Fotos y novedades de tu mascota' },
  { valor: 'mensajes', titulo: 'Mensajes', desc: 'Chat con tu cuidador o viajero' },
  { valor: 'promociones', titulo: 'Promociones', desc: 'Descuentos y novedades de la red' },
];

export const CANALES = [
  { valor: 'push', titulo: 'Notificación en el celular' },
  { valor: 'correo', titulo: 'Correo electrónico' },
  { valor: 'sms', titulo: 'Mensaje de texto (SMS)' },
];

export const NOMBRES_CALIFICACION = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

export const ETIQUETA_ROL = { viajero: 'Viajero', cuidador: 'Cuidador', admin: 'Administrador' };

const formato = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
export const fecha = (iso) => (iso ? formato.format(new Date(iso)) : '—');
