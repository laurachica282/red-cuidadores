import { ErrorHttp } from '../errores.js';

// HU-41. Historial de cuentas desactivadas SIN datos personales: sale de v_historial_cuentas,
// que no tiene nombre, correo ni teléfono. Las reservas, pagos y reseñas siguen entrando a los
// reportes porque la fila del usuario nunca se borra (trigger de 02_cuenta.sql).
export function crearAdminService({ pool }) {
  return {
    async listar({ pagina, tamano, rol, estado }) {
      const status = estado === 'desactivada' ? false : estado === 'reactivada' ? true : null;
      const filtros = [rol ?? null, status];

      const [lista, resumen] = await Promise.all([
        pool.query(
          `SELECT *, COUNT(*) OVER() AS total
             FROM v_historial_cuentas
            WHERE ($1::text IS NULL OR rol = $1) AND ($2::boolean IS NULL OR status = $2)
            ORDER BY COALESCE(desactivado_en, creado_en) DESC, usuario_id DESC
            LIMIT $3 OFFSET $4`,
          [...filtros, tamano, (pagina - 1) * tamano],
        ),
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE NOT status) AS desactivadas,
                  COUNT(*) FILTER (WHERE status)     AS reactivadas
             FROM v_historial_cuentas`,
        ),
      ]);

      return {
        pagina,
        tamano,
        total: Number(lista.rows[0]?.total ?? 0),
        resumen: {
          desactivadas: Number(resumen.rows[0].desactivadas),
          reactivadas: Number(resumen.rows[0].reactivadas),
        },
        cuentas: lista.rows.map(({ total, ...c }) => ({
          ...c,
          desactivaciones: Number(c.desactivaciones),
          reactivaciones: Number(c.reactivaciones),
        })),
      };
    },

    async historial(usuarioId) {
      const [cuenta, eventos] = await Promise.all([
        pool.query('SELECT * FROM v_historial_cuentas WHERE usuario_id = $1', [usuarioId]),
        pool.query(
          `SELECT id, evento, origen, motivo, detalle, creado_en
             FROM cuenta_eventos WHERE usuario_id = $1 ORDER BY creado_en DESC, id DESC`,
          [usuarioId],
        ),
      ]);
      if (!cuenta.rows[0]) throw new ErrorHttp(404, 'Esa cuenta no tiene historial de desactivación');
      return { cuenta: cuenta.rows[0], eventos: eventos.rows };
    },
  };
}
