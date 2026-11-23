// Agenda del cuidador: qué servicios tiene cada día. La usan el tablero (inicio) y el calendario.
import { reservasRecibidas, seguimientoReservas } from './services/cuidadoresService.js';

export const EN_AGENDA = new Set(['confirmada', 'en_curso', 'completada']);

export const isoLocal = (d) => d.toLocaleDateString('en-CA');
export const sumarDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
};

// Une el seguimiento (fase, mascota, chat) con la reserva (horas, nota) de cada servicio del cuidador.
export function armarAgenda(recibidas, seguimiento) {
  const porId = new Map(recibidas.map((r) => [String(r.id), r]));
  const items = seguimiento
    .filter((s) => s.soy === 'cuidador' && EN_AGENDA.has(s.estado))
    .map((s) => ({ ...s, reserva: porId.get(String(s.id)) }))
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio) || String(a.reserva?.hora_inicio ?? '').localeCompare(String(b.reserva?.hora_inicio ?? '')));
  const hoy = seguimiento[0]?.hoy ?? isoLocal(new Date());
  return { hoy, items };
}

export async function cargarAgenda() {
  const [recibidas, seguimiento] = await Promise.all([reservasRecibidas(), seguimientoReservas()]);
  return { recibidas, ...armarAgenda(recibidas, seguimiento) };
}

// Servicios de un día y qué pasa ese día: empieza, sigue, termina (entrega) o todo el mismo día.
export function serviciosDelDia(items, dia) {
  return items
    .filter((s) => s.fechaInicio <= dia && dia <= s.fechaFin)
    .map((s) => {
      let momento = 'sigue';
      if (s.fechaInicio === s.fechaFin) momento = 'unico';
      else if (s.fechaInicio === dia) momento = 'empieza';
      else if (s.fechaFin === dia) momento = 'termina';
      return { s, momento };
    });
}

// Los próximos servicios desde hoy (cada uno con el día en que toca), hasta `cuantos`.
export function proximosServicios(items, hoy, cuantos = 3) {
  const activos = items.filter((s) => s.estado !== 'completada');
  const lista = [];
  for (let i = 0; i <= 60 && lista.length < cuantos; i += 1) {
    const dia = sumarDias(hoy, i);
    for (const x of serviciosDelDia(activos, dia)) {
      // Un alojamiento de varios días aparece solo una vez: el primer día que cae desde hoy.
      if (!lista.some((y) => y.s.id === x.s.id)) lista.push({ ...x, dia });
    }
  }
  return lista.slice(0, cuantos);
}
