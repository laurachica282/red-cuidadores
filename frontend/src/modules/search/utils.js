export const TIPOS_MASCOTA = [
  { valor: '', texto: 'Todas' },
  { valor: 'perro', texto: 'Perro' },
  { valor: 'gato', texto: 'Gato' },
  { valor: 'ave', texto: 'Ave' },
  { valor: 'conejo', texto: 'Conejo' },
  { valor: 'otro', texto: 'Otro' },
];

// Mismo orden y claves que servicios_cuidador (12_servicios_cuidador.sql). Alojamiento por noche;
// los demás por hora, en un solo día (backend/src/shared/servicios.js).
export const SERVICIOS = [
  { valor: 'alojamiento', texto: 'Alojamiento', unidad: 'noche', porHora: false },
  { valor: 'domicilio', texto: 'Cuidado a domicilio', corto: 'A domicilio', unidad: 'hora', porHora: true },
  { valor: 'paseo', texto: 'Paseos', unidad: 'hora', porHora: true },
  { valor: 'guarderia', texto: 'Guardería de día', corto: 'Guardería', unidad: 'hora', porHora: true },
];
export const esPorHora = (valor) => Boolean(SERVICIOS.find((s) => s.valor === valor)?.porHora);

// Horas en punto que se pueden elegir (07:00 a 22:00) y cuántas hay entre dos.
export const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
export const horasEntre = (desde, hasta) => (desde && hasta ? Number(hasta.slice(0, 2)) - Number(desde.slice(0, 2)) : 0);
export const MAX_HORAS = 12;

export const servicio = (valor) => SERVICIOS.find((s) => s.valor === valor) ?? SERVICIOS[0];

export const iniciales =(nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const DIA = 24 * 60 * 60 * 1000;

// Fecha local (no UTC): en Colombia, desde las 7 p. m., UTC ya es mañana.
export const hoyISO = () => new Date().toLocaleDateString('en-CA');

export const noches = (desde, hasta) =>
  desde && hasta ? Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA) : 0;

const fechaTexto = (t, opc) => new Date(`${t}T12:00:00`).toLocaleDateString('es-CO', opc);
export const fechaCorta = (t) => fechaTexto(t, { weekday: 'short', day: 'numeric', month: 'short' });

// "12 – 14 nov" a partir de dos fechas YYYY-MM-DD (o "12 nov" si es el mismo día).
export function rangoFechas(desde, hasta) {
  const f = fechaTexto;
  if (!hasta || desde === hasta) return f(desde, { day: 'numeric', month: 'short' });
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return mismoMes
    ? `${f(desde, { day: 'numeric' })} – ${f(hasta, { day: 'numeric', month: 'short' })}`
    : `${f(desde, { day: 'numeric', month: 'short' })} – ${f(hasta, { day: 'numeric', month: 'short' })}`;
}

// "2 años", "5 meses" o "Nuevo" según la fecha de registro.
export function tiempoEnLaRed(desde) {
  const meses = Math.floor((Date.now() - Date.parse(desde)) / (30 * DIA));
  if (meses >= 12) {
    const anios = Math.floor(meses / 12);
    return `${anios} ${anios === 1 ? 'año' : 'años'}`;
  }
  if (meses >= 1) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  return 'Nuevo';
}

export const formatoCalificacion = (n) => n.toLocaleString('es-CO', { minimumFractionDigits: 1 });
