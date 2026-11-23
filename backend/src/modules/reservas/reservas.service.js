import { pool } from '../../db.js';
import { horaActual, hoyISO } from '../../shared/fecha.js';
import { HORAS, SERVICIOS, esHora, esPorHora, horasEntre } from '../../shared/servicios.js';
import { LIMITE_INICIO_SQL, actualizarEstados } from './ciclo.js';
import { aplicarCancelacion, cotizarCancelacion } from '../pagos/index.js';
import { diasNoDisponiblesEntre } from '../cuidadores/index.js';

const MAX_DIAS = 60;
const MAX_MASCOTAS = 10;
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

// Ids de las mascotas pedidas: mascota_ids (lista) o, por compatibilidad, mascota_id (una sola).
function idsMascotas(d) {
  const lista = Array.isArray(d.mascota_ids) ? d.mascota_ids : (d.mascota_id != null && d.mascota_id !== '' ? [d.mascota_id] : []);
  if (lista.length === 0) throw new ErrorReserva(400, 'Elige al menos una mascota');
  if (!lista.every(esId)) throw new ErrorReserva(400, 'Elige una mascota');
  const ids = [...new Set(lista.map(Number))];
  if (ids.length > MAX_MASCOTAS) throw new ErrorReserva(400, `Puedes llevar hasta ${MAX_MASCOTAS} mascotas por reserva`);
  return ids;
}

export async function crear(viajeroId, d) {
  if (!esId(d.cuidador_id)) throw new ErrorReserva(400, 'Elige un cuidador');
  const mascotaIds = idsMascotas(d);
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

  // Todas las mascotas deben ser del viajero y estar activas.
  const masc = await pool.query(
    'SELECT id, nombre, especie FROM mascotas WHERE id = ANY($1::int[]) AND usuario_id = $2 AND status',
    [mascotaIds, viajeroId]
  );
  if (masc.rows.length !== mascotaIds.length) throw new ErrorReserva(400, 'Esa mascota no es tuya o está desactivada');

  // Solo cuidadores verificados (RN-3) que ofrecen el servicio, con su tarifa, su moneda y las especies que acepta.
  const cui = await pool.query(
    `SELECT v.pais, v.tipos_mascota, s.tarifa, g.moneda
       FROM cuidadores_visibles v
       JOIN servicios_cuidador s ON s.usuario_id = v.usuario_id AND s.servicio = $2 AND s.activo
       JOIN regiones_reglas g ON g.pais = v.pais
      WHERE v.usuario_id = $1`,
    [d.cuidador_id, d.servicio]
  );
  const c = cui.rows[0];
  if (!c) throw new ErrorReserva(404, 'Ese cuidador no está disponible para ese servicio');

  // Cada mascota debe ser de una especie que el cuidador recibe (si no marcó ninguna, se entiende que todas).
  const tipos = c.tipos_mascota ?? [];
  const noAceptada = tipos.length > 0 && masc.rows.find((m) => !tipos.includes(m.especie));
  if (noAceptada) throw new ErrorReserva(400, `Este cuidador no recibe la especie de ${noAceptada.nombre}`);

  const viajero = await pool.query('SELECT pais FROM usuarios WHERE id = $1', [viajeroId]);
  if (viajero.rows[0]?.pais !== c.pais) throw new ErrorReserva(400, 'Solo puedes reservar cuidadores de tu región');

  // Días que el cuidador marcó como no disponibles: se revisan todos los días de la reserva (también el de salida).
  const bloqueados = await diasNoDisponiblesEntre(d.cuidador_id, d.fecha_inicio, fechaFin);
  if (bloqueados.length) throw new ErrorReserva(400, `El cuidador no está disponible estos días: ${bloqueados.join(', ')}`);

  await actualizarEstados(); // pone al día los estados antes de buscar cruces
  // El cuidador SÍ puede tener reservas que se cruzan (él decide al aceptar). Lo que no se permite es que
  // la misma mascota del viajero quede en dos reservas vivas a la misma hora.
  const cruce = await pool.query(
    `SELECT m.nombre FROM reservas r
       JOIN reserva_mascotas rm ON rm.reserva_id = r.id
       JOIN mascotas m ON m.id = rm.mascota_id
      WHERE r.viajero_id = $1 AND rm.mascota_id = ANY($2::int[])
        AND r.estado IN ('pendiente', 'confirmada', 'en_curso')
        AND r.periodo && tsrange($3::date + COALESCE($5::time, TIME '00:00'),
                                 CASE WHEN $6::time IS NULL THEN ($4::date + 1)::timestamp ELSE $4::date + $6::time END, '[)')
      LIMIT 1`,
    [viajeroId, mascotaIds, d.fecha_inicio, fechaFin, horaInicio, horaFin]
  );
  if (cruce.rows[0]) throw new ErrorReserva(409, `${cruce.rows[0].nombre} ya tiene una reserva que se cruza con esas fechas`);

  const nota = typeof d.nota === 'string' ? d.nota.trim().slice(0, 500) || null : null;
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    // Precio: total = tarifa × unidades (noches u horas) × número de mascotas.
    // reservas.mascota_id guarda la primera mascota (la principal); todas quedan en reserva_mascotas.
    const r = await db.query(
      `INSERT INTO reservas
         (viajero_id, cuidador_id, mascota_id, servicio, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
          tarifa, moneda, unidades, total, responder_antes, nota)
       VALUES ($1, $2, $3, $4, $5::date, $6::date, $11::time, $12::time,
               $7::numeric, $8, $9::integer, $7::numeric * $9::integer * $13::integer,
               NOW() + INTERVAL '24 hours', $10)
       RETURNING *`,
      [viajeroId, d.cuidador_id, mascotaIds[0], d.servicio, d.fecha_inicio, fechaFin, c.tarifa, c.moneda, unidades, nota,
        horaInicio, horaFin, mascotaIds.length]
    );
    await db.query(
      'INSERT INTO reserva_mascotas (reserva_id, mascota_id) SELECT $1, unnest($2::int[])',
      [r.rows[0].id, mascotaIds]
    );
    await db.query('COMMIT');
    return { ...r.rows[0], mascotas: masc.rows };
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    db.release();
  }
}

// Mascotas de la reserva: las de reserva_mascotas más la principal (por si una fila no tiene detalle).
// La principal va primero. Da mascotas: [{ id, nombre, especie }] y mascota: "Kira, Toby" (texto unido).
export const MASCOTAS_SQL = `
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', m.id, 'nombre', m.nombre, 'especie', m.especie)
                    ORDER BY (m.id = r.mascota_id) DESC, m.nombre) AS mascotas,
           string_agg(m.nombre, ', ' ORDER BY (m.id = r.mascota_id) DESC, m.nombre) AS mascota,
           COUNT(*)::int AS num_mascotas
      FROM mascotas m
     WHERE m.id = r.mascota_id
        OR m.id IN (SELECT rm.mascota_id FROM reserva_mascotas rm WHERE rm.reserva_id = r.id)
  ) mm ON TRUE`;

const SELECCION = `
  SELECT r.*, r.fecha_inicio::text AS fecha_inicio, r.fecha_fin::text AS fecha_fin,
         to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(r.hora_fin, 'HH24:MI') AS hora_fin,
         mm.mascotas, mm.mascota, mm.num_mascotas, uc.nombre AS cuidador, uv.nombre AS viajero,
         cc.motivo AS cancelacion_cuidador_motivo, cc.estado AS cancelacion_cuidador_estado,
         cc.multa AS cancelacion_cuidador_multa
    FROM reservas r
    ${MASCOTAS_SQL}
    JOIN usuarios uc ON uc.id = r.cuidador_id
    JOIN usuarios uv ON uv.id = r.viajero_id
    LEFT JOIN cancelaciones_cuidador cc ON cc.reserva_id = r.id`;

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

// Al confirmar se fija el plazo para pagar: 24 horas o el inicio de la reserva, lo que llegue primero
// (LIMITE_INICIO_SQL en ciclo.js). El cuidador puede confirmar aunque tenga otras reservas a la misma hora.
export async function confirmar(cuidadorId, id) {
  await vencerPendientes();
  const r = await pool.query(
    `UPDATE reservas r SET estado = 'confirmada', respondida_en = NOW(), actualizado_en = NOW(),
            pagar_antes = LEAST(NOW() + INTERVAL '24 hours', ${LIMITE_INICIO_SQL})
      WHERE r.id = $1 AND r.cuidador_id = $2 AND r.estado = 'pendiente' RETURNING *`,
    [id, cuidadorId]
  );
  if (r.rows[0]) return r.rows[0];
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