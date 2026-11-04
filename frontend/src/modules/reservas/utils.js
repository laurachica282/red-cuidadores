export const SERVICIOS = {
  alojamiento: { texto: 'Alojamiento', unidad: 'noche' },
  domicilio: { texto: 'Cuidado a domicilio', unidad: 'visita' },
  paseo: { texto: 'Paseos', unidad: 'paseo' },
  guarderia: { texto: 'Guardería de día', unidad: 'día' },
};

export const ESTADOS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
  en_curso: 'En curso',
  completada: 'Completada',
};

export const precio = (valor, moneda) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(valor);

export const hoyISO = () => new Date().toLocaleDateString('en-CA');

export const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);

export const fechaCorta = (t) =>
  new Date(`${String(t).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export const fechaHora = (t) =>
  new Date(t).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });