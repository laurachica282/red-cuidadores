import { CANALES, PREFERENCIAS_POR_DEFECTO } from '../config.js';

// HU-32 (mockup 16). Dos listas: qué eventos avisar y por qué canales. Un aviso sale solo si su
// evento está activo, y por los canales activos. Se guarda solo lo que el usuario cambió.
export function crearNotificacionesService({ pool }) {
  const leer = async (usuarioId) => {
    const { rows } = await pool.query(
      'SELECT tipo, clave, activo FROM preferencias_notificacion WHERE usuario_id = $1',
      [usuarioId],
    );
    const preferencias = structuredClone(PREFERENCIAS_POR_DEFECTO);
    for (const f of rows) preferencias[f.tipo === 'evento' ? 'eventos' : 'canales'][f.clave] = f.activo;
    return preferencias;
  };

  return {
    leer,

    async guardar(usuarioId, { eventos = {}, canales = {} }) {
      const filas = [
        ...Object.entries(eventos).map(([clave, activo]) => ['evento', clave, activo]),
        ...Object.entries(canales).map(([clave, activo]) => ['canal', clave, activo]),
      ];
      await pool.query(
        `INSERT INTO preferencias_notificacion (usuario_id, tipo, clave, activo)
         SELECT $1, t, c, a FROM unnest($2::text[], $3::text[], $4::boolean[]) AS x(t, c, a)
         ON CONFLICT (usuario_id, tipo, clave)
         DO UPDATE SET activo = EXCLUDED.activo, actualizado_en = NOW()`,
        [usuarioId, filas.map((f) => f[0]), filas.map((f) => f[1]), filas.map((f) => f[2])],
      );
      return leer(usuarioId);
    },

    // Para que otros módulos (reservas, seguimiento...) sepan por dónde avisar a un usuario.
    // Evento apagado: ningún canal.
    async canalesActivos(usuarioId, evento) {
      const p = await leer(usuarioId);
      return p.eventos[evento] ? CANALES.filter((c) => p.canales[c]) : [];
    },
  };
}
