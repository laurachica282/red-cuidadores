import { pool } from '../../db.js';
import { simularCobro } from './simulador.js';
import { METODOS } from './metodos.js';
import { horaActual, hoyISO } from '../../shared/fecha.js';

export class ErrorPago extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

const COLUMNAS = `id, reserva_id, viajero_id, cuidador_id, pasarela, moneda, monto, comision_pct,
  comision, neto_cuidador, estado, metodo, detalle, tarjeta_ultimos4, referencia, creado_en, liberado_en, monto_reembolsado`;

// HU-22: el dinero retenido pasa al cuidador cuando la reserva queda completada
// (el ciclo de reservas la completa al pasar la fecha de fin, ver reservas/ciclo.js).
export async function liberarCompletadas() {
  // Se libera y se deja el movimiento con el detalle de la comisión en la misma sentencia.
  await pool.query(
    `WITH liberados AS (
       UPDATE pagos p SET estado = 'liberado', liberado_en = NOW()
         FROM reservas r
        WHERE p.reserva_id = r.id AND p.estado = 'retenido' AND r.estado = 'completada'
        RETURNING p.*
     )
     INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, comision, detalle)
     SELECT id, reserva_id, 'liberacion', cuidador_id, moneda, neto_cuidador, 100 - comision_pct, comision,
            'Pago del servicio terminado'
       FROM liberados
     ON CONFLICT DO NOTHING`
  );
}

// Valida el formato de la tarjeta. Solo se guardan los últimos 4 dígitos, nunca el número completo.
function validarTarjeta(d = {}) {
  const numero = String(d.numero ?? '').replace(/[\s-]/g, '');
  if (!/^\d{16}$/.test(numero)) throw new ErrorPago(400, 'El número de la tarjeta debe tener 16 dígitos');

  const m = /^(\d{2})\/(\d{2})$/.exec(String(d.vence ?? '').trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) throw new ErrorPago(400, 'El vencimiento debe tener el formato MM/AA');
  const hoy = new Date();
  const anio = 2000 + Number(m[2]);
  if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && Number(m[1]) < hoy.getMonth() + 1)) {
    throw new ErrorPago(400, 'La tarjeta está vencida');
  }

  if (!/^\d{3,4}$/.test(String(d.cvv ?? ''))) throw new ErrorPago(400, 'El código de seguridad debe tener 3 o 4 dígitos');
  return { numero, ultimos4: numero.slice(-4) };
}

// Valida lo que pide cada método. Devuelve el dato a cobrar y una descripción segura para mostrar.
function validarMetodo(metodo, d) {
  if (metodo === 'tarjeta') {
    const t = validarTarjeta(d);
    return { valor: t.numero, detalle: `Tarjeta ••••${t.ultimos4}`, ultimos4: t.ultimos4 };
  }
  const m = METODOS[metodo];
  const valor = String(d.dato ?? '').trim();
  if (!m.valida(valor)) throw new ErrorPago(400, m.error);
  return { valor, detalle: m.detalle(valor), ultimos4: null };
}

const redondear = (n) => Math.round(n * 100) / 100;

// HU-18: el viajero paga una reserva confirmada. El dinero queda retenido hasta que termine el servicio.
export async function pagar(viajeroId, reservaId, datos = {}) {
  const metodo = String(datos.metodo ?? 'tarjeta');
  if (!Object.hasOwn(METODOS, metodo)) throw new ErrorPago(400, 'Elige un método de pago válido');
  const t = validarMetodo(metodo, datos);

  const rs = await pool.query(
    `SELECT r.id, r.cuidador_id, r.estado, r.total, r.moneda, r.fecha_inicio::text AS fecha_inicio, to_char(r.hora_inicio, 'HH24') AS hora_inicio, u.pais
       FROM reservas r JOIN usuarios u ON u.id = r.viajero_id
      WHERE r.id = $1 AND r.viajero_id = $2`,
    [reservaId, viajeroId]
  );
  const r = rs.rows[0];
  if (!r) throw new ErrorPago(404, 'Reserva no encontrada');
  if (r.estado !== 'confirmada') throw new ErrorPago(409, 'Solo puedes pagar una reserva que el cuidador ya confirmó');
  // Se paga hasta el mismo día de inicio; después la reserva se cancela sola (reservas/ciclo.js).
  // Por horas: se paga antes de la hora de inicio.
  const tarde = r.fecha_inicio < hoyISO()
    || (r.hora_inicio !== null && r.fecha_inicio === hoyISO() && Number(r.hora_inicio) <= horaActual());
  if (tarde) throw new ErrorPago(409, 'Ya pasó la fecha de inicio: esta reserva no se pagó a tiempo');

  const ya = await pool.query(
    `SELECT 1 FROM pagos WHERE reserva_id = $1 AND estado IN ('retenido', 'liberado')`,
    [reservaId]
  );
  if (ya.rows[0]) throw new ErrorPago(409, 'Esta reserva ya está pagada');

  // RN-1: la pasarela depende del país del viajero.
  const ps = await pool.query(
    'SELECT pasarela, moneda, comision_pct, metodos FROM pasarelas_pais WHERE pais = $1 AND activa',
    [r.pais]
  );
  const p = ps.rows[0];
  if (!p) throw new ErrorPago(409, 'Todavía no hay pagos disponibles en tu país');
  if (!p.metodos.includes(metodo)) throw new ErrorPago(409, 'Ese método de pago no está disponible en tu país');
  if (p.moneda.trim() !== r.moneda.trim()) {
    throw new ErrorPago(409, `La pasarela de tu país cobra en ${p.moneda.trim()} y la reserva está en ${r.moneda.trim()}`);
  }

  const monto = Number(r.total);
  const comision = redondear((monto * Number(p.comision_pct)) / 100);
  const neto = redondear(monto - comision);
  const cobro = simularCobro({ metodo, valor: t.valor }, p.pasarela);

  try {
    // Se guarda la pasarela y la comisión de ESTE pago: si el admin las cambia después, no se altera lo ya cobrado.
    const ins = await pool.query(
      `INSERT INTO pagos (reserva_id, viajero_id, cuidador_id, pasarela, moneda, monto,
                          comision_pct, comision, neto_cuidador, estado, tarjeta_ultimos4, referencia,
                          metodo, detalle)
       VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10, $11, $12, $13, $14)
       RETURNING ${COLUMNAS}`,
      [reservaId, viajeroId, r.cuidador_id, p.pasarela, r.moneda, monto, p.comision_pct, comision, neto,
        cobro.aprobado ? 'retenido' : 'fallido', t.ultimos4, cobro.referencia, metodo, t.detalle]
    );
    if (!cobro.aprobado) throw new ErrorPago(402, cobro.motivo);
    const pago = ins.rows[0];
    // HU-21: registro del movimiento (el dinero queda retenido hasta que termine el servicio).
    await pool.query(
      `INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, detalle)
       VALUES ($1, $2, 'cobro', $3, $4, $5, 100, $6)`,
      [pago.id, reservaId, r.cuidador_id, r.moneda, monto, t.detalle]
    );
    return pago;
  } catch (e) {
    // 23505: otro pago de la misma reserva se aprobó al mismo tiempo.
    if (e.code === '23505') throw new ErrorPago(409, 'Esta reserva ya está pagada');
    throw e;
  }
}

// Pagos de la persona, sea viajera (los que hizo) o cuidadora (los que le hicieron).
export async function delUsuario(usuarioId) {
  await liberarCompletadas();
  const r = await pool.query(
    `SELECT ${COLUMNAS} FROM pagos
      WHERE (viajero_id = $1 OR cuidador_id = $1) AND estado <> 'fallido'
      ORDER BY creado_en DESC`,
    [usuarioId]
  );
  return r.rows;
}
