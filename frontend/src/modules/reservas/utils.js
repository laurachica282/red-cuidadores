import { formatearPrecio, idiomaActual, localeActual, traducir } from '@/modules/region';
import './i18n.js';

// Alojamiento por noche; los demás por hora, en un solo día (backend/src/shared/servicios.js).
export const SERVICIOS = {
  alojamiento: { unidad: 'noche', porHora: false },
  domicilio: { unidad: 'hora', porHora: true },
  paseo: { unidad: 'hora', porHora: true },
  guarderia: { unidad: 'hora', porHora: true },
};
export const esPorHora = (servicio) => Boolean(SERVICIOS[servicio]?.porHora);
// Nombre del servicio en el idioma actual (claves 'servicio.*' del módulo región).
export const nombreServicio = (servicio) => (SERVICIOS[servicio] ? traducir(`servicio.${servicio}`) : servicio);
// "1 hora", "3 noches"... según la unidad del servicio.
export const textoUnidad = (unidad, cantidad = 1) =>
  traducir(`reservas.unidad.${unidad === 'hora' ? 'hora' : 'noche'}${cantidad === 1 ? '' : 's'}`);
// Horas en punto que se pueden reservar (07:00 a 22:00).
export const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
export const horasEntre = (desde, hasta) => (desde && hasta ? Number(hasta.slice(0, 2)) - Number(desde.slice(0, 2)) : 0);

// "27 nov · 09:00–11:00" o "12 nov – 15 nov", según la reserva sea por horas o por días.
export const cuandoReserva = (r) => (r.hora_inicio
  ? `${fechaCorta(r.fecha_inicio)} · ${r.hora_inicio.slice(0, 5)}–${r.hora_fin.slice(0, 5)}`
  : `${fechaCorta(r.fecha_inicio)} – ${fechaCorta(r.fecha_fin)}`);

// Estado de la reserva por su código, en el idioma actual.
export const textoEstado = (estado) => {
  const clave = `reservas.estado.${estado}`;
  const texto = traducir(clave);
  return texto === clave ? estado : texto;
};

export const textoEspecie = (especie) => {
  const clave = `reservas.especie.${especie}`;
  const texto = traducir(clave);
  return texto === clave ? especie : texto;
};

// Motivos fijos que escribe el servidor (reservas/ciclo.js, reservas.service.js y cancelaciones.js);
// los que escribe una persona quedan igual.
const MOTIVOS_FIJOS = {
  'Se canceló automáticamente: no se pagó antes de la fecha de inicio': 'reservas.motivo.sin_pago',
  'Se canceló automáticamente: no se pagó dentro del plazo': 'reservas.motivo.plazo_pago',
  'Cancelada por el viajero': 'reservas.motivo.cancelada_viajero',
  'Cancelada por el cuidador': 'reservas.motivo.cancelada_cuidador',
  'Cancelada por el cuidador · reembolso del 100 %': 'reservas.motivo.cancelada_cuidador_reembolso',
};
export function textoMotivo(motivo) {
  if (MOTIVOS_FIJOS[motivo]) return traducir(MOTIVOS_FIJOS[motivo]);
  const m = /^Cancelada por el viajero · reembolso del (\d+(?:\.\d+)?) %$/.exec(motivo ?? '');
  if (m) return traducir('reservas.motivo.cancelada_viajero_reembolso', { pct: m[1] });
  return motivo;
}

// Motivos con que el cuidador cancela una reserva aceptada (backend: reservas/cancelaciones.js).
export const MOTIVOS_CUIDADOR = ['enfermedad', 'emergencia_familiar', 'emergencia_mascota', 'fuerza_mayor', 'otro'];
export const textoMotivoCuidador = (motivo) => {
  const clave = `reservas.motivo_cuidador.${motivo}`;
  const texto = traducir(clave);
  return texto === clave ? motivo : texto;
};

// Nombres de las mascotas de la reserva: "Kira, Toby" (el servidor manda mascotas: [{ id, nombre, especie }]).
export const nombresMascotas = (r) =>
  (Array.isArray(r.mascotas) && r.mascotas.length ? r.mascotas.map((m) => m.nombre).join(', ') : r.mascota);

// Política de reembolso (pagos/reembolsos.js del servidor): se traduce por el texto exacto.
const POLITICA = {
  '7 días o más antes del inicio: se devuelve el 100 %': 'reservas.politica.100',
  'Entre 2 y 6 días antes: se devuelve el 50 %': 'reservas.politica.50',
  'Menos de 2 días antes: no hay reembolso': 'reservas.politica.0',
};
export const textoPolitica = (texto) => (POLITICA[texto] ? traducir(POLITICA[texto]) : texto);

// Detalle del pago que guarda el servidor (pagos/metodos.js): solo se traducen las partes que no son nombres propios.
export function textoDetallePago(detalle) {
  if (typeof detalle !== 'string') return detalle;
  const tarjeta = /^Tarjeta ••••(\d{4})$/.exec(detalle);
  if (tarjeta) return traducir('reservas.detalle.tarjeta', { ultimos: tarjeta[1] });
  if (detalle === 'OXXO · pago en efectivo') return traducir('reservas.detalle.oxxo');
  return detalle.replace('Banco de prueba (sin fondos)', traducir('reservas.detalle.banco_prueba'));
}

export const precio = (valor, moneda) => formatearPrecio(valor, moneda, idiomaActual());

export const hoyISO = () => new Date().toLocaleDateString('en-CA');

export const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);

export const fechaCorta = (t) =>
  new Date(`${String(t).slice(0, 10)}T12:00:00`).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' });

export const fechaHora = (t) =>
  new Date(t).toLocaleString(localeActual(), { dateStyle: 'medium', timeStyle: 'short' });
