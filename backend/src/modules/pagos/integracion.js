import { pool } from '../../db.js';
import { integraciones } from '../cuenta/index.js';
import { liberarCompletadas } from './pagos.service.js';

export function registrarIntegraciones() {
  // Viajero con reservas confirmadas que todavía no ha pagado.
  integraciones.registrarVerificacionPazYSalvo('pagos_pendientes', async ({ usuarioId }) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM reservas r
        WHERE r.viajero_id = $1 AND r.estado = 'confirmada'
          AND NOT EXISTS (SELECT 1 FROM pagos p
                           WHERE p.reserva_id = r.id AND p.estado IN ('retenido', 'liberado'))`,
      [usuarioId]
    );
    return rows[0].n;
  });

  // Cuidador con dinero retenido que todavía no se le entrega.
  integraciones.registrarVerificacionPazYSalvo('saldo_sin_liquidar', async ({ usuarioId }) => {
    await liberarCompletadas(); // lo que ya terminó se libera antes de contar
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM pagos WHERE cuidador_id = $1 AND estado = 'retenido'`,
      [usuarioId]
    );
    return rows[0].n;
  });
}