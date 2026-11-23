// Alojamiento por noche; los demás por hora, en un solo día (backend/src/shared/servicios.js).
export const SERVICIOS = {
  alojamiento: { texto: 'Alojamiento', unidad: 'noche', porHora: false },
  domicilio: { texto: 'Cuidado a domicilio', unidad: 'hora', porHora: true },
  paseo: { texto: 'Paseos', unidad: 'hora', porHora: true },
  guarderia: { texto: 'Guardería de día', unidad: 'hora', porHora: true },
};
export const esPorHora = (servicio) => Boolean(SERVICIOS[servicio]?.porHora);
// Horas en punto que se pueden reservar (07:00 a 22:00).
export const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
export const horasEntre = (desde, hasta) => (desde && hasta ? Number(hasta.slice(0, 2)) - Number(desde.slice(0, 2)) : 0);

// "27 nov · 09:00–11:00" o "12 nov – 15 nov", según la reserva sea por horas o por días.
export const cuandoReserva = (r) => (r.hora_inicio
  ? `${fechaCorta(r.fecha_inicio)} · ${r.hora_inicio.slice(0, 5)}–${r.hora_fin.slice(0, 5)}`
  : `${fechaCorta(r.fecha_inicio)} – ${fechaCorta(r.fecha_fin)}`);

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