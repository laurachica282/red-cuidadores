import { TIPOS_MASCOTA, servicio } from './utils.js';

export const ORDENES = [
  { valor: 'calificacion', texto: 'Mejor calificados' },
  { valor: 'distancia', texto: 'Más cerca', soloConPunto: true },
  { valor: 'precio', texto: 'Menor precio' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
];

export const RADIOS_KM = [2, 5, 10, 20];

export const FILTROS_VACIOS = {
  servicio: '', desde: '', hasta: '', q: '', tipo: '', precioMin: '', precioMax: '', orden: 'calificacion', radioKm: 10,
};

// Cuántos filtros cambió la persona, sin contar las fechas (se muestran aparte).
export const contarFiltros = (f) =>
  [f.q.trim(), f.tipo, f.precioMin, f.precioMax].filter(Boolean).length
  + ['servicio', 'orden', 'radioKm'].filter((k) => f[k] !== FILTROS_VACIOS[k]).length;

// Resumen de lo elegido (lista de textos), para mostrar en la tarjeta. Siempre dice qué servicio se busca.
export function resumirFiltros(f, precio, moneda) {
  const partes = [f.servicio ? servicio(f.servicio).texto : 'Todos los servicios'];
  if (f.tipo) partes.push(TIPOS_MASCOTA.find((t) => t.valor === f.tipo)?.texto);
  if (f.precioMin && f.precioMax) partes.push(`${precio(f.precioMin, moneda)} – ${precio(f.precioMax, moneda)}`);
  else if (f.precioMin) partes.push(`Desde ${precio(f.precioMin, moneda)}`);
  else if (f.precioMax) partes.push(`Hasta ${precio(f.precioMax, moneda)}`);
  if (f.radioKm !== FILTROS_VACIOS.radioKm) partes.push(`A ${f.radioKm} km`);
  if (f.orden !== FILTROS_VACIOS.orden) partes.push(ORDENES.find((o) => o.valor === f.orden)?.texto);
  if (f.q.trim()) partes.push(`"${f.q.trim()}"`);
  return partes;
}

// Las fechas valen si están las dos, la entrada no pasó y la salida es después.
export function errorFechas({ desde, hasta }, hoy) {
  if (!desde && !hasta) return '';
  if (!desde || !hasta) return 'Elige la fecha de entrada y la de salida.';
  if (desde < hoy) return 'La fecha de entrada ya pasó.';
  if (hasta <= desde) return 'La salida debe ser después de la entrada.';
  return '';
}
