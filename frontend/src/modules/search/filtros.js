import { traducir } from '@/modules/region';
import { MAX_HORAS, TIPOS_MASCOTA, esPorHora, horasEntre, servicio, textoHora, textoNoches } from './utils.js';
import './i18n.js';

// El texto se traduce al leerlo, así sigue al idioma actual.
const orden = (valor, extra = {}) => ({ valor, get texto() { return traducir(`busqueda.orden.${valor}`); }, ...extra });
export const ORDENES = [
  orden('calificacion'),
  orden('distancia', { soloConPunto: true }),
  orden('precio'),
  orden('precio_desc'),
];

export const RADIOS_KM = [2, 5, 10, 20];

export const FILTROS_VACIOS = {
  servicio: '', desde: '', hasta: '', horaDesde: '', horaHasta: '', q: '', tipo: '', precioMin: '', precioMax: '', orden: 'calificacion', radioKm: 10,
};

// Cuántos filtros cambió la persona, sin contar las fechas (se muestran aparte).
export const contarFiltros = (f) =>
  [f.q.trim(), f.tipo, f.precioMin, f.precioMax].filter(Boolean).length
  + ['servicio', 'orden', 'radioKm'].filter((k) => f[k] !== FILTROS_VACIOS[k]).length;

// Resumen de lo elegido (lista de textos), para mostrar en la tarjeta. Siempre dice qué servicio se busca.
export function resumirFiltros(f, precio, moneda) {
  const partes = [f.servicio ? servicio(f.servicio).texto : traducir('busqueda.todosServicios')];
  if (f.tipo) partes.push(TIPOS_MASCOTA.find((t) => t.valor === f.tipo)?.texto);
  if (f.precioMin && f.precioMax) partes.push(`${precio(f.precioMin, moneda)} – ${precio(f.precioMax, moneda)}`);
  else if (f.precioMin) partes.push(traducir('busqueda.resumen.desde', { precio: precio(f.precioMin, moneda) }));
  else if (f.precioMax) partes.push(traducir('busqueda.resumen.hasta', { precio: precio(f.precioMax, moneda) }));
  if (f.radioKm !== FILTROS_VACIOS.radioKm) partes.push(traducir('busqueda.resumen.radio', { n: f.radioKm }));
  if (f.orden !== FILTROS_VACIOS.orden) partes.push(ORDENES.find((o) => o.valor === f.orden)?.texto);
  if (f.q.trim()) partes.push(`"${f.q.trim()}"`);
  return partes;
}

// Las fechas se adaptan al servicio:
//   alojamiento: entrada y salida (al menos una noche);
//   por hora (domicilio, paseo, guardería): un día y, si se eligen, hora de inicio y de fin;
//   todos: un día o un rango.
export function errorFechas({ servicio: s, desde, hasta, horaDesde, horaHasta }, hoy) {
  if (!desde && !hasta && !horaDesde && !horaHasta) return '';
  if (!desde) return traducir(esPorHora(s) ? 'busqueda.error.elegirDia' : 'busqueda.error.elegirEntrada');
  if (desde < hoy) return traducir('busqueda.error.fechaPasada');
  if (esPorHora(s)) {
    if (!horaDesde && !horaHasta) return '';
    if (!horaDesde || !horaHasta) return traducir('busqueda.error.elegirHoras');
    const h = horasEntre(horaDesde, horaHasta);
    if (h <= 0) return traducir('busqueda.error.horaFin');
    if (h > MAX_HORAS) return traducir('busqueda.error.maxHoras', { n: MAX_HORAS });
    return '';
  }
  if (s === 'alojamiento') {
    if (!hasta) return traducir('busqueda.error.elegirSalida');
    if (hasta <= desde) return traducir('busqueda.error.salida');
  }
  if (hasta && hasta < desde) return traducir('busqueda.error.rango');
  return '';
}

// Parámetros de fecha que se envían al backend según el servicio (vacío si no hay fechas completas).
export function fechasParaBuscar(f, hoy) {
  if (!f.desde || errorFechas(f, hoy)) return {};
  if (esPorHora(f.servicio)) {
    return f.horaDesde ? { desde: f.desde, horaDesde: f.horaDesde, horaHasta: f.horaHasta } : { desde: f.desde };
  }
  return { desde: f.desde, hasta: f.hasta || f.desde };
}

// Texto de las fechas elegidas: "27 nov · 09:00–11:00 · 2 h", "12 – 14 nov · 2 noches" o "27 nov".
export function textoFechas(f, rango, noches) {
  const p = fechasParaBuscar(f, '');
  if (!p.desde) return '';
  if (p.horaDesde) {
    const h = horasEntre(p.horaDesde, p.horaHasta);
    return `${rango(p.desde, p.desde)} · ${textoHora(p.horaDesde)}–${textoHora(p.horaHasta)} · ${traducir('busqueda.horasCorto', { n: h })}`;
  }
  if (f.servicio === 'alojamiento') {
    const n = noches(p.desde, p.hasta);
    return `${rango(p.desde, p.hasta)} · ${textoNoches(n)}`;
  }
  return rango(p.desde, p.hasta ?? p.desde);
}
