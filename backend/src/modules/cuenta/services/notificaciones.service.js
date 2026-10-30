import { CANALES, EVENTOS_NOTIFICACION, PREFERENCIAS_POR_DEFECTO } from '../config.js';

// HU-32. Guarda solo lo que el usuario cambió; lo demás sale de PREFERENCIAS_POR_DEFECTO.
export function crearNotificacionesService({ pool }) {
  const leer = async (usuarioId) => {
    const { rows } = await pool.query(
      'SELECT evento, canal, activo FROM preferencias_notificacion WHERE usuario_id = $1',
      [usuarioId],
    );
    const matriz = structuredClone(PREFERENCIAS_POR_DEFECTO);
    for (const f of rows) matriz[f.evento][f.canal] = f.activo;
    return matriz;
  };

  return {
    leer,

    async guardar(usuarioId, preferencias) {
      const filas = [];
      for (const evento of EVENTOS_NOTIFICACION) {
        for (const canal of CANALES) {
          const activo = preferencias[evento]?.[canal];
          if (typeof activo === 'boolean') filas.push([evento, canal, activo]);
        }
      }
      await pool.query(
        `INSERT INTO preferencias_notificacion (usuario_id, evento, canal, activo)
         SELECT $1, e, c, a FROM unnest($2::text[], $3::text[], $4::boolean[]) AS t(e, c, a)
         ON CONFLICT (usuario_id, evento, canal)
         DO UPDATE SET activo = EXCLUDED.activo, actualizado_en = NOW()`,
        [usuarioId, filas.map((f) => f[0]), filas.map((f) => f[1]), filas.map((f) => f[2])],
      );
      return leer(usuarioId);
    },

    // Para que otros módulos (reservas, seguimiento...) sepan por dónde avisar a un usuario.
    async canalesActivos(usuarioId, evento) {
      const matriz = await leer(usuarioId);
      return CANALES.filter((c) => matriz[evento]?.[c]);
    },
  };
}
