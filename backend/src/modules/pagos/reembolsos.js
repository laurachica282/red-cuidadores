import { pool } from '../../db.js';
import { hoyISO } from '../../shared/fecha.js';

// HU-21: política de reembolso según la anticipación con que el viajero cancela.
// Lo que no se reembolsa se le paga al cuidador (menos la comisión) como compensación.
export const POLITICA = [
  { desdeDias: 7, porcentaje: 100, texto: '7 días o más antes del inicio: se devuelve el 100 %' },
  { desdeDias: 2, porcentaje: 50, texto: 'Entre 2 y 6 días antes: se devuelve el 50 %' },
  { desdeDias: -Infinity, porcentaje: 0, texto: 'Menos de 2 días antes: no hay reembolso' },
];

const DIA_MS = 24 * 60 * 60 * 1000;
const redondear = (n) => Math.round(n * 100) / 100;
const diasAntes = (fechaInicio) => Math.round((Date.parse(fechaInicio) - Date.parse(hoyISO())) / DIA_MS);
const reglaPara = (dias) => POLITICA.find((p) => dias >= p.desdeDias);

// Cuánto se devolvería si se cancela hoy. `db` puede ser el pool o un cliente dentro de una transacción.
export async function cotizarCancelacion(reserva, db = pool) {
  const dias = diasAntes(reserva.fecha_inicio);
  const regla = reglaPara(dias);
  const { rows } = await db.query(
    `SELECT id, monto, moneda, comision_pct FROM pagos WHERE reserva_id = $1 AND estado = 'retenido'`,
    [reserva.id]
  );
  const pago = rows[0] ?? null;
  const monto = pago ? Number(pago.monto) : 0;
  const reembolso = redondear((monto * regla.porcentaje) / 100);
  return {
    pagada: Boolean(pago),
    diasAntes: dias,
    porcentaje: pago ? regla.porcentaje : null,
    reembolso,
    retiene: redondear(monto - reembolso),
    moneda: (pago?.moneda ?? reserva.moneda).trim(),
    regla: regla.texto,
    politica: POLITICA.map((p) => p.texto),
  };
}

// Aplica la cancelación sobre el pago retenido de la reserva. Debe llamarse dentro de una transacción
// (el módulo reservas cambia el estado de la reserva en la misma). Deja registro en movimientos_pago.
export async function aplicarCancelacion(db, reserva) {
  const { rows } = await db.query(
    `SELECT * FROM pagos WHERE reserva_id = $1 AND estado = 'retenido' FOR UPDATE`,
    [reserva.id]
  );
  const pago = rows[0];
  const cotizacion = await cotizarCancelacion(reserva, db);
  if (!pago) return cotizacion; // confirmada sin pagar: no hay dinero que mover

  const { reembolso, retiene, porcentaje } = cotizacion;
  const comision = redondear((retiene * Number(pago.comision_pct)) / 100);
  const neto = redondear(retiene - comision);

  await db.query(
    `UPDATE pagos SET estado = $2::varchar, monto_reembolsado = $3, comision = $4, neto_cuidador = $5,
                      liberado_en = CASE WHEN $2::varchar = 'liberado' THEN NOW() END
      WHERE id = $1`,
    [pago.id, retiene > 0 ? 'liberado' : 'reembolsado', reembolso, comision, neto]
  );
  if (reembolso > 0) {
    await db.query(
      `INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, detalle)
       VALUES ($1, $2, 'reembolso', $3, $4, $5, $6, $7)`,
      [pago.id, reserva.id, pago.viajero_id, pago.moneda, reembolso, porcentaje,
        `Cancelación ${cotizacion.diasAntes} día(s) antes del inicio · ${cotizacion.regla}`]
    );
  }
  if (retiene > 0) {
    await db.query(
      `INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, comision, detalle)
       VALUES ($1, $2, 'liberacion', $3, $4, $5, $6, $7, 'Compensación por cancelación tardía')`,
      [pago.id, reserva.id, pago.cuidador_id, pago.moneda, neto, 100 - porcentaje, comision]
    );
  }
  return cotizacion;
}

// Movimientos de dinero de la persona (como viajero o como cuidador), del más reciente al más antiguo.
export async function movimientosDe(usuarioId) {
  const { rows } = await pool.query(
    `SELECT m.id, m.pago_id, m.reserva_id, m.tipo, m.moneda, m.monto, m.porcentaje, m.comision, m.detalle, m.creado_en,
            m.beneficiario_id = $1 AS a_mi_favor
       FROM movimientos_pago m JOIN pagos p ON p.id = m.pago_id
      WHERE p.viajero_id = $1 OR p.cuidador_id = $1
      ORDER BY m.creado_en DESC, m.id DESC`,
    [usuarioId]
  );
  return rows;
}

// El cuidador cancela una reserva aceptada: al viajero se le devuelve el 100 % de lo pagado.
// Debe llamarse dentro de la transacción del módulo reservas. Devuelve lo devuelto (0 si no estaba pagada).
export async function reembolsarTodo(db, reserva, detalle) {
  const { rows } = await db.query(
    `SELECT * FROM pagos WHERE reserva_id = $1 AND estado = 'retenido' FOR UPDATE`,
    [reserva.id]
  );
  const pago = rows[0];
  if (!pago) return { pagada: false, reembolso: 0, moneda: reserva.moneda.trim() };
  const monto = Number(pago.monto);
  await db.query(
    `UPDATE pagos SET estado = 'reembolsado', monto_reembolsado = $2, comision = 0, neto_cuidador = 0, liberado_en = NULL
      WHERE id = $1`,
    [pago.id, monto]
  );
  await db.query(
    `INSERT INTO movimientos_pago (pago_id, reserva_id, tipo, beneficiario_id, moneda, monto, porcentaje, detalle)
     VALUES ($1, $2, 'reembolso', $3, $4, $5, 100, $6)`,
    [pago.id, reserva.id, pago.viajero_id, pago.moneda, monto, detalle]
  );
  return { pagada: true, reembolso: monto, moneda: pago.moneda.trim() };
}
