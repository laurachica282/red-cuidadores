import { pool } from '../../db.js';
import { integraciones } from '../cuenta/index.js';

const ACTIVAS = "('pendiente','confirmada','en_curso')";

export function registrarIntegraciones() {
  // Reseñas (HU-33): la cuenta pregunta por una reserva y su estado.
  integraciones.registrarReservas({
    async obtener(id) {
      const { rows } = await pool.query(
        `SELECT id, viajero_id, cuidador_id, estado FROM reservas WHERE id = $1`,
        [id]
      );
      if (!rows[0]) return null;
      const r = rows[0];
      return { id: r.id, viajeroId: r.viajero_id, cuidadorId: r.cuidador_id, estado: r.estado };
    },
  });

  // Paz y salvo (RN-4 / HU-38): no puede cerrar la cuenta con reservas activas.
  integraciones.registrarVerificacionPazYSalvo('reservas_activas', async ({ usuarioId }) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM reservas
        WHERE estado IN ${ACTIVAS} AND (viajero_id = $1 OR cuidador_id = $1)`,
      [usuarioId]
    );
    const n = rows[0].n;
    return n > 0 ? { cantidad: n, detalle: `Tienes ${n} reserva(s) activa(s)` } : 0;
  });
}