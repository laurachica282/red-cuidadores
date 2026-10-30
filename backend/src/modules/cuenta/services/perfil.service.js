import { ErrorHttp } from '../errores.js';

const COLUMNAS = `id, nombre, correo, rol, telefono, ciudad, foto_url, pais, idioma, moneda,
                  correo_verificado, dos_pasos, creado_en`;

export const urlFoto = (nombre) => (nombre ? `/cuenta/fotos/${nombre}` : null);

// Lo que el frontend puede ver. Nunca clave_hash ni nombres de archivo internos.
export const aPerfil = ({ foto_url, ...u }) => ({ ...u, foto: urlFoto(foto_url) });

// Campos que HU-09 permite editar. El correo NO está: se cambia solo por HU-06.
const EDITABLES = ['nombre', 'telefono', 'ciudad'];

export function crearPerfilService({ pool, fotos, codigos }) {
  const obtener = async (usuarioId) => {
    const r = await pool.query(`SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`, [usuarioId]);
    if (!r.rows[0]) throw new ErrorHttp(404, 'No encontramos tu cuenta');
    return r.rows[0];
  };

  return {
    async perfil(usuarioId) {
      const u = await obtener(usuarioId);
      const pendiente = await codigos.vigente(usuarioId, 'cambio_correo');
      return {
        ...aPerfil(u),
        // Si dejó un cambio de correo a medias, la pantalla puede retomarlo.
        cambio_correo_pendiente: pendiente ? { correo_nuevo: pendiente.destino, expira_en: pendiente.expira_en } : null,
      };
    },

    async actualizar(usuarioId, cambios) {
      const campos = EDITABLES.filter((c) => c in cambios);
      const sets = campos.map((c, i) => `${c} = $${i + 2}`);
      const r = await pool.query(
        `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $1 RETURNING ${COLUMNAS}`,
        [usuarioId, ...campos.map((c) => cambios[c])],
      );
      return aPerfil(r.rows[0]);
    },

    async cambiarFoto(usuarioId, buffer) {
      const anterior = (await obtener(usuarioId)).foto_url;
      const nombre = await fotos.guardar(buffer);
      try {
        const r = await pool.query(`UPDATE usuarios SET foto_url = $2 WHERE id = $1 RETURNING ${COLUMNAS}`, [usuarioId, nombre]);
        await fotos.borrar(anterior);
        return aPerfil(r.rows[0]);
      } catch (e) {
        await fotos.borrar(nombre);
        throw e;
      }
    },

    async quitarFoto(usuarioId) {
      const anterior = (await obtener(usuarioId)).foto_url;
      const r = await pool.query(`UPDATE usuarios SET foto_url = NULL WHERE id = $1 RETURNING ${COLUMNAS}`, [usuarioId]);
      await fotos.borrar(anterior);
      return aPerfil(r.rows[0]);
    },
  };
}
