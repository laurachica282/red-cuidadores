import { pool } from '../../db.js';
import { AHORA_SQL, HOY_SQL, ZONA } from '../../shared/fecha.js';
import { liberarCompletadas } from '../pagos/index.js';

// Ciclo de vida de la reserva (un solo lugar decide los cambios automáticos de estado):
//   pendiente  → vencida     sin respuesta en 24 h, o ya llegó la fecha de inicio sin respuesta
//   confirmada → cancelada   no se pagó dentro del plazo (pagar_antes); si la fila no tiene plazo, al pasar el inicio
//   confirmada → en_curso    está pagada y llegó el día de inicio
//   en_curso   → completada  pasó el día de fin; el pago retenido se libera al cuidador (HU-22)
// Alojamiento va por días: el día de inicio, sin pagar, sigue "confirmada" (todavía se puede pagar).
// Los servicios por hora van por la hora: empiezan y terminan a la hora reservada.

export const MOTIVO_SIN_PAGO = 'Se canceló automáticamente: no se pagó antes de la fecha de inicio';
export const MOTIVO_PLAZO_PAGO = 'Se canceló automáticamente: no se pagó dentro del plazo';

// ¿Ya empezó? / ¿ya terminó? según el tipo de reserva (con horas o por días).
const EMPEZO = `(CASE WHEN r.hora_inicio IS NULL THEN r.fecha_inicio <= ${HOY_SQL}
                     ELSE r.fecha_inicio + r.hora_inicio <= ${AHORA_SQL} END)`;
const PASO_INICIO = `(CASE WHEN r.hora_inicio IS NULL THEN r.fecha_inicio < ${HOY_SQL}
                          ELSE r.fecha_inicio + r.hora_inicio <= ${AHORA_SQL} END)`;
export const TERMINO = `(CASE WHEN r.hora_fin IS NULL THEN r.fecha_fin < ${HOY_SQL}
                      ELSE r.fecha_fin + r.hora_fin <= ${AHORA_SQL} END)`;

// Último momento para pagar según el inicio (hora de Bogotá, como TIMESTAMPTZ): por horas, la hora de inicio;
// alojamiento, el final del día de entrada (igual que la regla de siempre: ese día todavía se puede pagar).
// Al confirmar, pagar_antes = LEAST(NOW() + 24 h, este momento).
export const LIMITE_INICIO_SQL = `((CASE WHEN r.hora_inicio IS NULL THEN (r.fecha_inicio + 1)::timestamp
                                       ELSE r.fecha_inicio + r.hora_inicio END) AT TIME ZONE '${ZONA}')`;

const PAGADA = `EXISTS (SELECT 1 FROM pagos p WHERE p.reserva_id = r.id AND p.estado IN ('retenido', 'liberado'))`;

export async function actualizarEstados() {
  await pool.query(
    `UPDATE reservas r SET estado = 'vencida', actualizado_en = NOW()
      WHERE r.estado = 'pendiente' AND (r.responder_antes < NOW() OR ${PASO_INICIO})`
  );
  // Con plazo guardado manda el plazo; las filas viejas sin plazo siguen la regla del inicio.
  await pool.query(
    `UPDATE reservas r SET estado = 'cancelada', actualizado_en = NOW(),
            motivo_rechazo = CASE WHEN r.pagar_antes IS NOT NULL THEN $2 ELSE $1 END
      WHERE r.estado = 'confirmada' AND NOT ${PAGADA}
        AND (CASE WHEN r.pagar_antes IS NOT NULL THEN NOW() > r.pagar_antes ELSE ${PASO_INICIO} END)`,
    [MOTIVO_SIN_PAGO, MOTIVO_PLAZO_PAGO]
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
