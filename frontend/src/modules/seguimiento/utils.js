import { localeActual, traducir } from '@/modules/region';
import './i18n.js';

// Idiomas en los que puede llegar guardado un texto fijo (ej. el motivo de una alerta).
const IDIOMAS_TEXTO = ['es', 'en', 'pt'];

// Nombre del servicio y de la fase (las fases las calcula el backend en seguimiento.service.js).
export const servicio = (codigo) => traducir(`seguimiento.servicio.${codigo}`);
export const fase = (codigo) => traducir(`seguimiento.fase.${codigo}`);

const fecha = (iso, opciones) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString(localeActual(), opciones);

// "8 – 10 nov" (o "28 nov – 2 dic").
export function rango(desde, hasta) {
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return mismoMes
    ? `${fecha(desde, { day: 'numeric' })} – ${fecha(hasta, { day: 'numeric', month: 'short' })}`
    : `${fecha(desde, { day: 'numeric', month: 'short' })} – ${fecha(hasta, { day: 'numeric', month: 'short' })}`;
}

export const diaLargo = (iso) => fecha(iso, { weekday: 'long', day: 'numeric', month: 'long' });
export const diaCorto = (iso) => fecha(iso, { day: 'numeric', month: 'short' });
export const hora = (t) => new Date(t).toLocaleTimeString(localeActual(), { hour: 'numeric', minute: '2-digit' });

// "Hoy", "Ayer" o "martes 4 de noviembre", según el día de servicio `hoy`.
export function nombreDia(iso, hoy) {
  if (iso === hoy) return traducir('seguimiento.hoy');
  const ayer = new Date(Date.parse(`${hoy}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  if (iso === ayer) return traducir('seguimiento.ayer');
  return diaLargo(iso);
}

export const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const primerNombre = (nombre = '') => nombre.split(' ')[0];

/* ───── Textos fijos que llegan del backend en español ───── */

// Motivos de la hoja de emergencia: el mensaje se guarda en el idioma de quien lo envió ("Se perdió. Detalle…").
// Cada rol tiene sus motivos: el viajero (dueño) y el cuidador.
export const MOTIVOS = {
  viajero: ['no_come', 'herida', 'perdida', 'no_responden', 'otro'],
  cuidador: ['mascota_enferma', 'mascota_perdida', 'sin_dueno', 'casa', 'otro'],
};
const TODOS_LOS_MOTIVOS = [...new Set([...MOTIVOS.viajero, ...MOTIVOS.cuidador])];

// Traduce el motivo del inicio del mensaje de una alerta (y el mensaje por defecto); el detalle escrito queda igual.
export function textoAlerta(mensaje) {
  if (!mensaje) return mensaje;
  for (const defecto of ['seguimiento.emerg.mensaje_defecto', 'seguimiento.emerg.mensaje_defecto_cuidador']) {
    if (IDIOMAS_TEXTO.some((i) => traducir(defecto, {}, i) === mensaje)) return traducir(defecto);
  }
  for (const motivo of TODOS_LOS_MOTIVOS) {
    const clave = `seguimiento.emerg.motivo.${motivo}`;
    for (const idioma of IDIOMAS_TEXTO) {
      const texto = traducir(clave, {}, idioma);
      if (mensaje === texto) return traducir(clave);
      if (mensaje.startsWith(`${texto}. `)) return `${traducir(clave)}${mensaje.slice(texto.length)}`;
    }
  }
  return mensaje;
}

// "25/11" (DD/MM, como lo arma el backend) → "25 nov" en el idioma actual.
function diaMes(dd, mm) {
  const d = new Date(new Date().getFullYear(), Number(mm) - 1, Number(dd), 12);
  // Sin el punto final de la abreviatura ("nov."), porque la frase ya puede terminar en punto.
  return d.toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' }).replace(/\.$/, '');
}

const RANGO = String.raw`del (\d\d)/(\d\d) al (\d\d)/(\d\d)`;

// Reglas por tipo de aviso (prefijo del id): el backend arma título y texto en español con partes fijas.
// Cada regla devuelve la clave y los datos; lo que no coincide se muestra tal como llegó.
const AVISOS = {
  rep: {
    titulo: [[/^Nuevo reporte de (.+)$/s, (m) => ['reporte_titulo', { mascota: m[1] }]]],
    texto: [[/^(\S+) compartió: (.+?)( \(con foto\))?$/s,
      (m) => [m[3] ? 'reporte_texto_foto' : 'reporte_texto', { nombre: m[1], titulo: m[2] }]]],
  },
  msj: {
    titulo: [[/^Mensaje de (.+)$/s, (m) => ['mensaje_titulo', { nombre: m[1] }]]],
  },
  res: {
    titulo: [
      [/^Reserva confirmada$/, () => ['confirmada_titulo', {}]],
      [/^Reserva rechazada$/, () => ['rechazada_titulo', {}]],
    ],
    texto: [
      [new RegExp(String.raw`^(\S+) aceptó cuidar a (.+) ${RANGO}$`, 's'),
        (m) => ['confirmada_texto', { nombre: m[1], mascota: m[2], desde: diaMes(m[3], m[4]), hasta: diaMes(m[5], m[6]) }]],
      [new RegExp(String.raw`^(\S+) no puede cuidar a (.+) ${RANGO}$`, 's'),
        (m) => ['rechazada_texto', { nombre: m[1], mascota: m[2], desde: diaMes(m[3], m[4]), hasta: diaMes(m[5], m[6]) }]],
    ],
  },
  sol: {
    titulo: [[/^Nueva solicitud de (.+)$/s, (m) => ['solicitud_titulo', { nombre: m[1] }]]],
    texto: [[new RegExp(String.raw`^(.+) ${RANGO}(\. Responde en 24 horas\.)?$`, 's'),
      (m) => [m[6] ? 'solicitud_texto_pendiente' : 'solicitud_texto',
        { mascota: m[1], desde: diaMes(m[2], m[3]), hasta: diaMes(m[4], m[5]) }]]],
  },
  ale: {
    titulo: [[/^Emergencia con (.+)$/s, (m) => ['alerta_titulo', { mascota: m[1] }]]],
  },
  rec: {
    titulo: [
      [/^Mañana recoges a (.+)$/s, (m) => ['recoges_titulo', { mascota: m[1] }]],
      [/^Mañana entregas a (.+)$/s, (m) => ['entregas_titulo', { mascota: m[1] }]],
    ],
    texto: [[/^El servicio con (\S+) termina el (\d\d)\/(\d\d)\.$/,
      (m) => ['termina_texto', { nombre: m[1], fecha: diaMes(m[2], m[3]) }]]],
  },
};

function aplicar(texto, reglas = []) {
  for (const [expr, armar] of reglas) {
    const m = expr.exec(String(texto ?? ''));
    if (m) {
      const [clave, vars] = armar(m);
      return traducir(`seguimiento.notif.${clave}`, vars);
    }
  }
  return texto;
}

// Título y texto del aviso en el idioma actual. Los mensajes del chat y los títulos de reporte quedan como se escribieron.
export function traducirAviso(n) {
  const tipo = String(n.id).slice(0, 3);
  const reglas = AVISOS[tipo] ?? {};
  return {
    titulo: aplicar(n.titulo, reglas.titulo),
    texto: tipo === 'ale' ? textoAlerta(n.texto) : aplicar(n.texto, reglas.texto),
  };
}
