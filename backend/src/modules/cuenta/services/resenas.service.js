import { ErrorHttp } from '../errores.js';

// HU-33. Solo el viajero de una reserva completada puede calificarla, una sola vez.
export function crearResenasService({ pool, integraciones }) {
  // Comprueba que la reserva existe, es del usuario y se completó.
  const reservaCalificable = async (usuarioId, reservaId) => {
    const reserva = await integraciones.reservas.obtener(reservaId);
    if (!reserva) throw new ErrorHttp(404, 'No encontramos esa reserva');
    // Si no es suya, se responde igual que si no existiera.
    if (String(reserva.viajeroId) !== String(usuarioId)) throw new ErrorHttp(404, 'No encontramos esa reserva');
    return reserva;
  };

  return {
    // Datos para pintar el formulario: a quién se califica y si ya se puede.
    async estadoDeReserva(usuarioId, reservaId) {
      const reserva = await reservaCalificable(usuarioId, reservaId);
      const [cuidador, existente] = await Promise.all([
        pool.query('SELECT id, nombre, foto_url FROM usuarios WHERE id = $1', [reserva.cuidadorId]),
        pool.query('SELECT id, calificacion, comentario, creado_en FROM resenas WHERE reserva_id = $1', [reservaId]),
      ]);
      const completada = reserva.estado === 'completada';
      return {
        reserva_id: reservaId,
        cuidador: cuidador.rows[0] ? { id: cuidador.rows[0].id, nombre: cuidador.rows[0].nombre } : null,
        puede_calificar: completada && !existente.rows[0],
        motivo: existente.rows[0] ? 'Ya calificaste esta reserva' : (completada ? null : 'Podrás calificar cuando el servicio termine'),
        resena: existente.rows[0] ?? null,
      };
    },

    async crear(usuarioId, { reserva_id, calificacion, comentario }) {
      const reserva = await reservaCalificable(usuarioId, reserva_id);
      if (reserva.estado !== 'completada') {
        throw new ErrorHttp(409, 'Solo puedes calificar reservas completadas');
      }
      try {
        const r = await pool.query(
          `INSERT INTO resenas (reserva_id, autor_id, cuidador_id, calificacion, comentario)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, reserva_id, cuidador_id, calificacion, comentario, creado_en`,
          [reserva_id, usuarioId, reserva.cuidadorId, calificacion, comentario ?? null],
        );
        return r.rows[0];
      } catch (e) {
        if (e.code === '23505') throw new ErrorHttp(409, 'Ya calificaste esta reserva');
        throw e;
      }
    },

    async mias(usuarioId) {
      const r = await pool.query(
        `SELECT r.id, r.reserva_id, r.calificacion, r.comentario, r.creado_en, u.nombre AS cuidador_nombre
           FROM resenas r JOIN usuarios u ON u.id = r.cuidador_id
          WHERE r.autor_id = $1
          ORDER BY r.creado_en DESC`,
        [usuarioId],
      );
      return r.rows;
    },
  };
}
