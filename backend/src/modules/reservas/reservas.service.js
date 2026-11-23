import { pool } from '../../db.js';
import { horaActual, hoyISO } from '../../shared/fecha.js';
import { HORAS, SERVICIOS, esHora, esPorHora, horasEntre } from '../../shared/servicios.js';
import { actualizarEstados } from './ciclo.js';
import { aplicarCancelacion, cotizarCancelacion } from '../pagos/index.js';

const MAX_DIAS = 60;
const DIA_MS = 24 * 60 * 60 * 1000;

const esFecha = (t) => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t));
const esId = (v) => /^\d+$/.test(String(v ?? ''));
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS);

export class ErrorReserva extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Pone al día los estados (vencer, cancelar sin pago, en curso, completar) antes de leer o cambiar.
export const vencerPendientes = actualizarEstados;

export async function crear(viajeroId, d) {
  if (!esId(d.cuidador_id)) throw new ErrorReserva(400, 'Elige un cuidador');
  if (!esId(d.mascota_id)) throw new ErrorReserva(400, 'Elige una mascota');
  if (!SERVICIOS[d.servicio]) throw new ErrorReserva(400, 'Elige un servicio válido');
  if (String(d.cuidador_id) === String(viajeroId)) throw new ErrorReserva(400, 'No puedes reservarte a ti mismo');
  const porHora = esPorHora(d.servicio);
  // Por horas es un solo día: la fecha de fin es la de inicio.
  const fechaFin = porHora ? d.fecha_inicio : d.fecha_fin;
  if (!esFecha(d.fecha_inicio) || !esFecha(fechaFin)) throw new ErrorReserva(400, 'Las fechas no son válidas');
  if (d.fecha_inicio < hoyISO()) throw new ErrorReserva(400, 'La fecha de entrada ya pasó');

  let unidades;
  let horaInicio = null;
  let horaFin = null;
  if (porHora) {
    if (!esHora(d.hora_inicio) || !esHora(d.hora_fin)) throw new ErrorReserva(400, 'Elige la hora de inicio y de fin (horas en punto)');
    unidades = horasEntre(d.hora_inicio, d.hora_fin);
    if (unidades <= 0) throw new ErrorReserva(400, 'La hora de fin debe ser posterior a la de inicio');
    if (unidades < HORAS.min || unidades > HORAS.max) {
      throw new ErrorReserva(400, `El servicio debe durar entre ${HORAS.min} y ${HORAS.max} horas`);
    }
    if (d.fecha_inicio === hoyISO() && Number(d.hora_inicio.slice(0, 2)) <= horaActual()) {
      throw new ErrorReserva(400, 'Esa hora ya pasó: elige una hora más tarde');
    }
    horaInicio = d.hora_inicio;
    horaFin = d.hora_fin;
  } else {
    unidades = diasEntre(d.fecha_inicio, fechaFin);
    if (unidades < 1) throw new ErrorReserva(400, 'El alojamiento necesita al menos una noche');
    if (unidades > MAX_DIAS) throw new ErrorReserva(400, `La reserva no puede durar más de ${MAX_DIAS} días`);
  }

  const masc = await pool.query(
    'SELECT id FROM mascotas WHERE id = $1 AND usuario_id = $2 AND status',
    [d.mascota_id, viajeroId]
  );
  if (!masc.rows[0]) throw new ErrorReserva(400, 'Esa mascota no es tuya o está desactivada');

  // Solo cuidadores verificados (RN-3) que ofrecen el servicio, con su tarifa y su moneda.
  const cui = await pool.query(
    `SELECT v.pais, s.tarifa, g.moneda
       FROM cuidadores_visibles v
       JOIN servicios_cuidador s ON s.usuario_id = v.usuario_id AND s.servicio = $2 AND s.activo
       JOIN regiones_reglas g ON g.pais = v.pais
      WHERE v.usuario_id = $1`,
    [d.cuidador_id, d.servicio]
  );
  const c = cui.rows[0];
  if (!c) throw new ErrorReserva(404, 'Ese cuidador no está disponible para ese servicio');

  const viajero = await pool.query('SELECT pais FROM usuarios WHERE id = $1', [viajeroId]);
  if (viajero.rows[0]?.pais !== c.pais) throw new ErrorReserva(400, 'Solo puedes reservar cuidadores de tu región');

  await actualizarEstados(); // libera fechas de reservas que se cancelaron sin pago
  // Se cruzan tramos de tiempo (21_servicios_por_hora.sql): dos paseos el mismo día a horas distintas sí caben.
  const cruce = await pool.query(
    `SELECT 1 FROM reservas
      WHERE cuidador_id = $1 AND estado IN ('confirmada', 'en_curso')
        AND periodo && tsrange($2::date + COALESCE($4::time, TIME '00:00'),
                               CASE WHEN $5::time IS NULL THEN ($3::date + 1)::timestamp ELSE $3::date + $5::time END, '[)')
      LIMIT 1`,
    [d.cuidador_id, d.fecha_inicio, fechaFin, horaInicio, horaFin]
  );
  if (cruce.rows[0]) throw new ErrorReserva(409, porHora ? 'El cuidador ya tiene una reserva confirmada a esa hora' : 'El cuidador ya tiene una reserva confirmada en esas fechas');

  const nota = typeof d.nota === 'string' ? d.nota.trim().slice(0, 500) || null : null;
    const r = await pool.query(
    `INSERT INTO reservas
       (viajero_id, cuidador_id, mascota_id, servicio, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
        tarifa, moneda, unidades, total, responder_antes, nota)
     VALUES ($1, $2, $3, $4, $5::date, $6::date, $11::time, $12::time,
             $7::numeric, $8, $9::integer, $7::numeric * $9::integer,
             NOW() + INTERVAL '24 hours', $10)
     RETURNING *`,
    [viajeroId, d.cuidador_id, d.mascota_id, d.servicio, d.fecha_inicio, fechaFin, c.tarifa, c.moneda, unidades, nota, horaInicio, horaFin]
  );
  return r.rows[0];
}

const SELECCION = `
  SELECT r.*, r.fecha_inicio::text AS fecha_inicio, r.fecha_fin::text AS fecha_fin,
         to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(r.hora_fin, 'HH24:MI') AS hora_fin,
         m.nombre AS mascota, uc.nombre AS cuidador, uv.nombre AS viajero
    FROM reservas r
    JOIN mascotas m  ON m.id = r.mascota_id
    JOIN usuarios uc ON uc.id = r.cuidador_id
    JOIN usuarios uv ON uv.id = r.viajero_id`;

export async function delViajero(viajeroId) {
  await vencerPendientes();
  const r = await pool.query(`${SELECCION} WHERE r.viajero_id = $1 ORDER BY r.creado_en DESC`, [viajeroId]);
  return r.rows;
}

export async function delCuidador(cuidadorId) {
  await vencerPendientes();
  const r = await pool.query(`${SELECCION} WHERE r.cuidador_id = $1 ORDER BY r.creado_en DESC`, [cuidadorId]);
  return r.rows;
}

export async function obtener(usuarioId, id) {
  await vencerPendientes();
  const r = await pool.query(
    `${SELECCION} WHERE r.id = $1 AND (r.viajero_id = $2 OR r.cuidador_id = $2)`,
    [id, usuarioId]
  );
  if (!r.rows[0]) throw new ErrorReserva(404, 'Reserva no encontrada');
  return r.rows[0];
}

// Si la actualización no tocó ninguna fila, explica por qué.
async function explicarFallo(id, columnaDueno, usuarioId) {
  const r = await pool.query(`SELECT estado, ${columnaDueno} AS dueno FROM reservas WHERE id = $1`, [id]);
  const f = r.rows[0];
  if (!f || String(f.dueno) !== String(usuarioId)) throw new ErrorReserva(404, 'Reserva no encontrada');
  if (f.estado === 'vencida') throw new ErrorReserva(409, 'Esta solicitud venció: pasaron más de 24 horas sin respuesta');
  if (f.estado === 'confirmada') {
    throw new ErrorReserva(409, 'Esta reserva ya está confirmada. Para cancelarla se aplica la política de reembolso');
  }
  if (f.estado === 'en_curso') throw new ErrorReserva(409, 'El servicio ya empezó: ya no se puede cancelar');
  throw new ErrorReserva(409, `Esta reserva ya está ${f.estado}`);
}

export async function confirmar(cuidadorId, id) {
  await vencerPendientes();
  try {
    const r = await pool.query(
      `UPDATE reservas SET estado = 'confirmada', respondida_en = NOW(), actualizado_en = NOW()
        WHERE id = $1 AND cuidador_id = $2 AND estado = 'pendiente' RETURNING *`,
      [id, cuidadorId]
    );
    if (r.rows[0]) return r.rows[0];
  } catch (e) {
    // 23P01: la restricción que impide cruzar fechas confirmadas.
    if (e.code === '23P01') throw new ErrorReserva(409, 'Ya tienes una reserva confirmada que se cruza con esas fechas');
    throw e;
  }
  return explicarFallo(id, 'cuidador_id', cuidadorId);
}

export async function rechazar(cuidadorId, id, motivo) {
  const texto = typeof motivo === 'string' ? motivo.trim().slice(0, 300) : '';
  if (!texto) throw new ErrorReserva(400, 'Escribe el motivo del rechazo');
  await vencerPendientes();
  const r = await pool.query(
    `UPDATE reservas SET estado = 'rechazada', motivo_rechazo = $3, respondida_en = NOW(), actualizado_en = NOW()
      WHERE id = $1 AND cuidador_id = $2 AND estado = 'pendiente' RETURNING *`,
    [id, cuidadorId, texto]
  );
  if (r.rows[0]) return r.rows[0];
  return explicarFallo(id, 'cuidador_id', cuidadorId);
}

// HU-21: el viajero cancela una solicitud pendiente (sin dinero de por medio) o una reserva confirmada.
// En la confirmada se devuelve el pago según la anticipación (pagos/reembolsos.js), todo en una transacción.
export async function cancelar(viajeroId, id) {
  await vencerPendientes();
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query(
      `SELECT *, fecha_inicio::text AS fecha_inicio FROM reservas
        WHERE id = $1 AND viajero_id = $2 AND estado IN ('pendiente', 'confirmada') FOR UPDATE`,
      [id, viajeroId]
    );
    const reserva = rows[0];
    if (!reserva) {
      await db.query('ROLLBACK');
      return explicarFallo(id, 'viajero_id', viajeroId);
    }
    const reembolso = reserva.estado === 'confirmada' ? await aplicarCancelacion(db, reserva) : null;
    const motivo = reembolso?.pagada
      ? `Cancelada por el viajero · reembolso del ${reembolso.porcentaje} %`
      : 'Cancelada por el viajero';
    const r = await db.query(
      `UPDATE reservas SET estado = 'cancelada', motivo_rechazo = $2, actualizado_en = NOW() WHERE id = $1 RETURNING *`,
      [id, motivo]
    );
    await db.query('COMMIT');
    return { ...r.rows[0], reembolso };
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    db.release();
  }
}

// HU-21: lo que se devolvería si el viajero cancela hoy (para mostrarlo antes de confirmar).
export async function cotizarCancelar(viajeroId, id) {
  await vencerPendientes();
  const { rows } = await pool.query(
    `SELECT id, estado, moneda, fecha_inicio::text AS fecha_inicio FROM reservas WHERE id = $1 AND viajero_id = $2`,
    [id, viajeroId]
  );
  const reserva = rows[0];
  if (!reserva) throw new ErrorReserva(404, 'Reserva no encontrada');
  if (!['pendiente', 'confirmada'].includes(reserva.estado)) return explicarFallo(id, 'viajero_id', viajeroId);
  return { estado: reserva.estado, ...(await cotizarCancelacion(reserva)) };
}