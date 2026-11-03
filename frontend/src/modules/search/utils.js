export const TIPOS_MASCOTA = [
  { valor: '', texto: 'Todas' },
  { valor: 'perro', texto: 'Perro' },
  { valor: 'gato', texto: 'Gato' },
  { valor: 'ave', texto: 'Ave' },
  { valor: 'conejo', texto: 'Conejo' },
  { valor: 'otro', texto: 'Otro' },
];

// Mismo orden y claves que servicios_cuidador (12_servicios_cuidador.sql).
export const SERVICIOS = [
  { valor: 'alojamiento', texto: 'Alojamiento', unidad: 'noche' },
  { valor: 'domicilio', texto: 'Cuidado a domicilio', corto: 'A domicilio', unidad: 'visita' },
  { valor: 'paseo', texto: 'Paseos', unidad: 'paseo' },
  { valor: 'guarderia', texto: 'Guardería de día', corto: 'Guardería', unidad: 'día' },
];
export const servicio = (valor) => SERVICIOS.find((s) => s.valor === valor) ?? SERVICIOS[0];

export const iniciales =(nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const DIA = 24 * 60 * 60 * 1000;

export const hoyISO = () => new Date().toISOString().slice(0, 10);

export const noches = (desde, hasta) =>
  desde && hasta ? Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA) : 0;

// "12 – 14 nov" a partir de dos fechas YYYY-MM-DD.
export function rangoFechas(desde, hasta) {
  const f = (t, opc) => new Date(`${t}T12:00:00`).toLocaleDateString('es-CO', opc);
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
