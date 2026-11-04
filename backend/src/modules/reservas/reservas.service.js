import { pool } from '../../db.js';

const SERVICIOS = ['alojamiento', 'domicilio', 'paseo', 'guarderia'];
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

// HU-17: la solicitud que el cuidador no responde en 24 h pasa a "vencida".
export async function vencerPendientes() {
  await pool.query(
    `UPDATE reservas SET estado = 'vencida', actualizado_en = NOW()
      WHERE estado = 'pendiente' AND responder_antes < NOW()`
  );
}

export async function crear(viajeroId, d) {
  if (!esId(d.cuidador_id)) throw new ErrorReserva(400, 'Elige un cuidador');
  if (!esId(d.mascota_id)) throw new ErrorReserva(400, 'Elige una mascota');
  if (!SERVICIOS.includes(d.servicio)) throw new ErrorReserva(400, 'Elige un servicio válido');
  if (!esFecha(d.fecha_inicio) || !esFecha(d.fecha_fin)) throw new ErrorReserva(400, 'Las fechas no son válidas');
  if (String(d.cuidador_id) === String(viajeroId)) throw new ErrorReserva(400, 'No puedes reservarte a ti mismo');

  const noches = diasEntre(d.fecha_inicio, d.fecha_fin);
  if (noches < 0) throw new ErrorReserva(400, 'La fecha de salida no puede ser anterior a la de entrada');
  if (d.servicio === 'alojamiento' && noches < 1) throw new ErrorReserva(400, 'El alojamiento necesita al menos una noche');
  if (noches > MAX_DIAS) throw new ErrorReserva(400, `La reserva no puede durar más de ${MAX_DIAS} días`);
  const unidades = d.servicio === 'alojamiento' ? noches : noches + 1;

  const hoy = (await pool.query('SELECT CURRENT_DATE::text AS hoy')).rows[0].hoy;
  if (d.fecha_inicio < hoy) throw new ErrorReserva(400, 'La fecha de entrada ya pasó');

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

  const cruce = await pool.query(
    `SELECT 1 FROM reservas
      WHERE cuidador_id = $1 AND estado IN ('confirmada', 'en_curso')
        AND daterange(fecha_inicio, fecha_fin, '[]') && daterange($2::date, $3::date, '[]')
      LIMIT 1`,
    [d.cuidador_id, d.fecha_inicio, d.fecha_fin]
  );
  if (cruce.rows[0]) throw new ErrorReserva(409, 'El cuidador ya tiene una reserva confirmada en esas fechas');

  const nota = typeof d.nota === 'string' ? d.nota.trim().slice(0, 500) || null : null;
    const r = await pool.query(
    `INSERT INTO reservas
       (viajero_id, cuidador_id, mascota_id, servicio, fecha_inicio, fecha_fin,
        tarifa, moneda, unidades, total, responder_antes, nota)
     VALUES ($1, $2, $3, $4, $5::date, $6::date,
             $7::numeric, $8, $9::integer, $7::numeric * $9::integer,
             NOW() + INTERVAL '24 hours', $10)
     RETURNING *`,
    [viajeroId, d.cuidador_id, d.mascota_id, d.servicio, d.fecha_inicio, d.fecha_fin, c.tarifa, c.moneda, unidades, nota]
  );
  return r.rows[0];
}

const SELECCION = `
  SELECT r.*, r.fecha_inicio::text AS fecha_inicio, r.fecha_fin::text AS fecha_fin,
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

// El viajero solo cancela solicitudes pendientes. Cancelar una confirmada (con reembolso) es HU-21.
export async function cancelar(viajeroId, id) {
  await vencerPendientes();
  const r = await pool.query(
    `UPDATE reservas SET estado = 'cancelada', actualizado_en = NOW()
      WHERE id = $1 AND viajero_id = $2 AND estado = 'pendiente' RETURNING *`,
    [id, viajeroId]
  );
  if (r.rows[0]) return r.rows[0];
  return explicarFallo(id, 'viajero_id', viajeroId);
}