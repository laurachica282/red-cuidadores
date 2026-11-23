import { idiomaActual, localeActual, traducir } from '@/modules/region';
import './i18n.js';

// El texto se traduce al leerlo (getter), así sigue al idioma elegido en cada render.
const opcion = (valor, clave, extra = {}) => ({ valor, get texto() { return traducir(clave); }, ...extra });

export const TIPOS_MASCOTA = ['', 'perro', 'gato', 'ave', 'conejo', 'otro']
  .map((v) => opcion(v, `busqueda.tipo.${v || 'todas'}`));

// Mismo orden y claves que servicios_cuidador (12_servicios_cuidador.sql). Alojamiento por noche;
// los demás por hora, en un solo día (backend/src/shared/servicios.js).
// texto: nombre completo; corto: el que cabe en un chip (si no tiene uno propio, es el mismo texto).
const CON_CORTO = ['domicilio', 'guarderia'];
const servicioDef = (valor, unidad) => ({
  valor,
  get texto() { return traducir(`servicio.${valor}`); },
  get corto() { return CON_CORTO.includes(valor) ? traducir(`busqueda.servicioCorto.${valor}`) : this.texto; },
  unidad,
  porHora: unidad === 'hora',
});
export const SERVICIOS = [
  servicioDef('alojamiento', 'noche'),
  servicioDef('domicilio', 'hora'),
  servicioDef('paseo', 'hora'),
  servicioDef('guarderia', 'hora'),
];
// "/noche" o "/hora" a partir del código de unidad que manda el backend.
export const porUnidad = (unidad) => traducir(`busqueda.porUnidad.${unidad}`);
export const esPorHora = (valor) => Boolean(SERVICIOS.find((s) => s.valor === valor)?.porHora);

// Horas en punto que se pueden elegir (07:00 a 22:00) y cuántas hay entre dos.
export const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
export const horasEntre = (desde, hasta) => (desde && hasta ? Number(hasta.slice(0, 2)) - Number(desde.slice(0, 2)) : 0);
export const MAX_HORAS = 12;
// "09:00" → "09:00" (es/pt, 24 h como hasta ahora) o "9:00 AM" (en), según el idioma.
export const textoHora = (hhmm) =>
  new Date(2000, 0, 1, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)))
    .toLocaleTimeString(localeActual(), { hour: idiomaActual() === 'en' ? 'numeric' : '2-digit', minute: '2-digit', hour12: idiomaActual() === 'en' });

export const servicio = (valor) => SERVICIOS.find((s) => s.valor === valor) ?? SERVICIOS[0];

export const iniciales =(nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const DIA = 24 * 60 * 60 * 1000;

// Fecha local (no UTC): en Colombia, desde las 7 p. m., UTC ya es mañana.
export const hoyISO = () => new Date().toLocaleDateString('en-CA');

export const noches = (desde, hasta) =>
  desde && hasta ? Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA) : 0;

const fechaTexto = (t, opc) => new Date(`${t}T12:00:00`).toLocaleDateString(localeActual(), opc);
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
    return traducir(anios === 1 ? 'busqueda.anios.uno' : 'busqueda.anios.otros', { n: anios });
  }
  if (meses >= 1) return traducir(meses === 1 ? 'busqueda.meses.uno' : 'busqueda.meses.otros', { n: meses });
  return traducir('busqueda.nuevo');
}

export const formatoCalificacion = (n) => n.toLocaleString(localeActual(), { minimumFractionDigits: 1 });

// "1,5" / "1.5" según el idioma, y con la unidad: "1,5 km".
export const numeroKm = (km) => Number(km).toLocaleString(localeActual(), { maximumFractionDigits: 1 });
export const formatoKm = (km) => traducir('busqueda.km', { n: numeroKm(km) });

// "3 noches" / "3 nights".
export const textoNoches = (n) => traducir(n === 1 ? 'busqueda.noches.uno' : 'busqueda.noches.otros', { n });
