// Servicios que ofrece un cuidador y cómo se cobra cada uno (una sola definición para todos los módulos).
//   alojamiento: la mascota duerme en casa del cuidador → por noche, con fecha de entrada y salida.
//   domicilio, paseo y guardería: por hora → un día, con hora de inicio y de fin.
export const SERVICIOS = {
  alojamiento: { nombre: 'Alojamiento', unidad: 'noche', porHora: false },
  domicilio: { nombre: 'Cuidado a domicilio', unidad: 'hora', porHora: true },
  paseo: { nombre: 'Paseo', unidad: 'hora', porHora: true },
  guarderia: { nombre: 'Guardería', unidad: 'hora', porHora: true },
};
export const ORDEN_SERVICIOS = Object.keys(SERVICIOS);
export const esPorHora = (servicio) => Boolean(SERVICIOS[servicio]?.porHora);
export const unidadDe = (servicio) => SERVICIOS[servicio]?.unidad ?? 'noche';

// Servicios por hora: entre 1 y 12 horas, en horas enteras.
export const HORAS = { min: 1, max: 12 };
export const esHora = (t) => /^([01]\d|2[0-3]):00$/.test(String(t ?? ''));
export const horasEntre = (desde, hasta) => Number(hasta.slice(0, 2)) - Number(desde.slice(0, 2));
