export const SERVICIOS = {
  alojamiento: 'Alojamiento',
  domicilio: 'Cuidado a domicilio',
  paseo: 'Paseos',
  guarderia: 'Guardería de día',
};

// Fases que calcula el backend (seguimiento.service.js).
export const FASES = {
  en_curso: { texto: 'En curso', grupo: 'En curso' },
  proxima: { texto: 'Confirmada', grupo: 'Próximas' },
  pendiente: { texto: 'Pendiente', grupo: 'Esperando respuesta' },
  terminada: { texto: 'Terminada', grupo: 'Pasadas' },
  inactiva: { texto: 'No activa', grupo: 'Canceladas o rechazadas' },
};

const fecha = (iso, opciones) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', opciones);

// "8 – 10 nov" (o "28 nov – 2 dic").
export function rango(desde, hasta) {
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return mismoMes
    ? `${fecha(desde, { day: 'numeric' })} – ${fecha(hasta, { day: 'numeric', month: 'short' })}`
    : `${fecha(desde, { day: 'numeric', month: 'short' })} – ${fecha(hasta, { day: 'numeric', month: 'short' })}`;
}

export const diaLargo = (iso) => fecha(iso, { weekday: 'long', day: 'numeric', month: 'long' });
export const diaCorto = (iso) => fecha(iso, { day: 'numeric', month: 'short' });
export const hora = (t) => new Date(t).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

// "Hoy", "Ayer" o "martes 4 de noviembre", según el día de servicio `hoy`.
export function nombreDia(iso, hoy) {
  if (iso === hoy) return 'Hoy';
  const ayer = new Date(Date.parse(`${hoy}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  if (iso === ayer) return 'Ayer';
  return diaLargo(iso);
}

export const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const primerNombre = (nombre = '') => nombre.split(' ')[0];
