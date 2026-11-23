import { pool } from '../../db.js';
import { reembolsarTodo } from '../pagos/index.js';
import { TERMINO, actualizarEstados } from './ciclo.js';
import { ErrorReserva, MASCOTAS_SQL } from './reservas.service.js';

// El cuidador cancela una reserva que ya aceptó (confirmada, o en curso antes de terminar).
// El viajero recibe el 100 % de lo pagado y un administrador revisa el motivo: puede ponerle una multa
// que se descuenta de los próximos pagos del cuidador (pagos/pagos.service.js → liberarCompletadas).
export const MOTIVOS_CUIDADOR = ['enfermedad', 'emergencia_familiar', 'emergencia_mascota', 'fuerza_mayor', 'otro'];
const MIN_DETALLE = 10;

export async function cancelarComoCuidador(cuidadorId, id, d = {}) {
  const motivo = String(d.motivo ?? '');
  if (!MOTIVOS_CUIDADOR.includes(motivo)) throw new ErrorReserva(400, 'Elige el motivo de la cancelación');
  const detalle = typeof d.detalle === 'string' ? d.detalle.trim().slice(0, 500) : '';
  if (detalle.length < MIN_DETALLE) {
    throw new ErrorReserva(400, `Cuenta qué pasó (mínimo ${MIN_DETALLE} caracteres)`);
  }

  await actualizarEstados();
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query(
      `SELECT r.*, r.fecha_inicio::text AS fecha_inicio, ${TERMINO} AS termino
         FROM reservas r WHERE r.id = $1 AND r.cuidador_id = $2 FOR UPDATE`,
      [id, cuidadorId]
    );
    const reserva = rows[0];
    if (!reserva) throw new ErrorReserva(404, 'Reserva no encontrada');
    if (!['confirmada', 'en_curso'].includes(reserva.estado) || reserva.termino) {
      throw new ErrorReserva(409, 'Solo puedes cancelar una reserva aceptada que todavía no termina');
    }

    const reembolso = await reembolsarTodo(db, reserva, 'Cancelada por el cuidador · se devuelve el 100 %');
    const texto = reembolso.pagada ? 'Cancelada por el cuidador · reembolso del 100 %' : 'Cancelada por el cuidador';
    const r = await db.query(
      `UPDATE reservas SET estado = 'cancelada', motivo_rechazo = $2, actualizado_en = NOW() WHERE id = $1 RETURNING *`,
      [id, texto]
    );
    const c = await db.query(
      `INSERT INTO cancelaciones_cuidador (reserva_id, cuidador_id, motivo, detalle, moneda)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, cuidadorId, motivo, detalle, reserva.moneda]
    );
    await db.query('COMMIT');
    return { ...r.rows[0], reembolso, cancelacion: c.rows[0] };
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    if (e.code === '23505') throw new ErrorReserva(409, 'Esta reserva ya se canceló');
    throw e;
  } finally {
    db.release();
  }
}

// Administración: cancelaciones del cuidador por revisar o ya revisadas.
const FILTROS = {
  en_revision: ['en_revision'],
  revisadas: ['sin_multa', 'con_multa'],
  sin_multa: ['sin_multa'],
  con_multa: ['con_multa'],
  todas: ['en_revision', 'sin_multa', 'con_multa'],
};

export async function listarCancelaciones(estado = 'en_revision') {
  const estados = FILTROS[estado];
  if (!estados) throw new ErrorReserva(400, 'Filtro no válido');
  const { rows } = await pool.query(
    `SELECT c.id, c.reserva_id, c.motivo, c.detalle, c.estado, c.multa, c.moneda, c.nota_admin,
            c.revisado_en, c.descontada_en, c.creado_en, ua.nombre AS revisado_por,
            uc.id AS cuidador_id, uc.nombre AS cuidador, uc.correo AS cuidador_correo,
            uv.nombre AS viajero, r.servicio, r.fecha_inicio::text AS fecha_inicio, r.fecha_fin::text AS fecha_fin,
            to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(r.hora_fin, 'HH24:MI') AS hora_fin,
            r.total, mm.mascota, mm.mascotas
       FROM cancelaciones_cuidador c
       JOIN reservas r ON r.id = c.reserva_id
       ${MASCOTAS_SQL}
       JOIN usuarios uc ON uc.id = c.cuidador_id
       JOIN usuarios uv ON uv.id = r.viajero_id
       LEFT JOIN usuarios ua ON ua.id = c.revisado_por
      WHERE c.estado = ANY($1::text[])
      ORDER BY CASE WHEN c.estado = 'en_revision' THEN c.creado_en END ASC,
               c.revisado_en DESC NULLS LAST, c.id DESC`,
    [estados]
  );
  return rows;
}

// El administrador decide: sin multa, o con una multa (mayor que 0 y como máximo el total de la reserva).
export async function revisarCancelacion(adminId, id, d = {}) {
  const decision = String(d.decision ?? '');
  if (!['sin_multa', 'con_multa'].includes(decision)) throw new ErrorReserva(400, 'Elige si hay multa o no');
  const nota = typeof d.nota === 'string' ? d.nota.trim().slice(0, 500) || null : null;

  const { rows } = await pool.query(
    `SELECT c.estado, r.total FROM cancelaciones_cuidador c JOIN reservas r ON r.id = c.reserva_id WHERE c.id = $1`,
    [id]
  );
  const actual = rows[0];
  if (!actual) throw new ErrorReserva(404, 'Cancelación no encontrada');
  if (actual.estado !== 'en_revision') throw new ErrorReserva(409, 'Esta cancelación ya fue revisada');

  let multa = 0;
  if (decision === 'con_multa') {
    multa = Math.round(Number(d.multa) * 100) / 100;
    if (!Number.isFinite(multa) || multa <= 0) throw new ErrorReserva(400, 'La multa debe ser mayor que 0');
    if (multa > Number(actual.total)) throw new ErrorReserva(400, 'La multa no puede ser mayor que el total de la reserva');
  }

  const r = await pool.query(
    `UPDATE cancelaciones_cuidador
        SET estado = $2, multa = $3, nota_admin = $4, revisado_por = $5, revisado_en = NOW()
      WHERE id = $1 AND estado = 'en_revision' RETURNING *`,
    [id, decision, multa, nota, adminId]
  );
  if (!r.rows[0]) throw new ErrorReserva(409, 'Esta cancelación ya fue revisada');
  return r.rows[0];
}
