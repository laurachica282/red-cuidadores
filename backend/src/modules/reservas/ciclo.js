import { pool } from '../../db.js';
import { AHORA_SQL, HOY_SQL } from '../../shared/fecha.js';
import { liberarCompletadas } from '../pagos/index.js';

// Ciclo de vida de la reserva (un solo lugar decide los cambios automáticos de estado):
//   pendiente  → vencida     sin respuesta en 24 h, o ya llegó la fecha de inicio sin respuesta
//   confirmada → cancelada   no se pagó y ya pasó el día de inicio (libera las fechas del cuidador)
//   confirmada → en_curso    está pagada y llegó el día de inicio
//   en_curso   → completada  pasó el día de fin; el pago retenido se libera al cuidador (HU-22)
// Alojamiento va por días: el día de inicio, sin pagar, sigue "confirmada" (todavía se puede pagar).
// Los servicios por hora van por la hora: empiezan y terminan a la hora reservada.

export const MOTIVO_SIN_PAGO = 'Se canceló automáticamente: no se pagó antes de la fecha de inicio';

// ¿Ya empezó? / ¿ya terminó? según el tipo de reserva (con horas o por días).
const EMPEZO = `(CASE WHEN r.hora_inicio IS NULL THEN r.fecha_inicio <= ${HOY_SQL}
                     ELSE r.fecha_inicio + r.hora_inicio <= ${AHORA_SQL} END)`;
const PASO_INICIO = `(CASE WHEN r.hora_inicio IS NULL THEN r.fecha_inicio < ${HOY_SQL}
                          ELSE r.fecha_inicio + r.hora_inicio <= ${AHORA_SQL} END)`;
const TERMINO = `(CASE WHEN r.hora_fin IS NULL THEN r.fecha_fin < ${HOY_SQL}
                      ELSE r.fecha_fin + r.hora_fin <= ${AHORA_SQL} END)`;

const PAGADA = `EXISTS (SELECT 1 FROM pagos p WHERE p.reserva_id = r.id AND p.estado IN ('retenido', 'liberado'))`;

export async function actualizarEstados() {
  await pool.query(
    `UPDATE reservas r SET estado = 'vencida', actualizado_en = NOW()
      WHERE r.estado = 'pendiente' AND (r.responder_antes < NOW() OR ${PASO_INICIO})`
  );
  await pool.query(
    `UPDATE reservas r SET estado = 'cancelada', motivo_rechazo = $1, actualizado_en = NOW()
      WHERE r.estado = 'confirmada' AND ${PASO_INICIO} AND NOT ${PAGADA}`,
    [MOTIVO_SIN_PAGO]
  );
  await pool.query(
    `UPDATE reservas r SET estado = 'en_curso', actualizado_en = NOW()
      WHERE r.estado = 'confirmada' AND ${EMPEZO} AND ${PAGADA}`
  );
  await pool.query(
    `UPDATE reservas r SET estado = 'completada', actualizado_en = NOW()
      WHERE r.estado = 'en_curso' AND ${TERMINO}`
  );
  await liberarCompletadas();
}

// Render gratis duerme el servidor: por eso además de este reloj se llama al leer reservas.
const CADA_MS = 10 * 60 * 1000;
export function iniciarReloj() {
  const correr = () => actualizarEstados().catch((e) => console.error('[reservas] ciclo de estados:', e.message));
  correr();
  setInterval(correr, CADA_MS).unref();
}
