import bcrypt from 'bcrypt';
import { ErrorHttp } from '../errores.js';
import { plantillas } from '../plantillas.js';
import { CODIGO } from '../config.js';

// HU-06. El correo no cambia hasta que el código llegue al correo NUEVO y se confirme.
export function crearCorreoService({ pool, codigos, correo }) {
  return {
    async solicitar(usuarioId, { correo_nuevo, clave }) {
      const { rows: [u] } = await pool.query('SELECT correo, clave_hash FROM usuarios WHERE id = $1', [usuarioId]);
      if (!u) throw new ErrorHttp(404, 'No encontramos tu cuenta');

      // Pide la clave actual: un token robado no alcanza para secuestrar la cuenta.
      if (!(await bcrypt.compare(clave, u.clave_hash))) throw new ErrorHttp(403, 'La contraseña no es correcta');
      if (correo_nuevo === u.correo) throw new ErrorHttp(400, 'Ese ya es tu correo actual');

      const ocupado = await pool.query('SELECT 1 FROM usuarios WHERE correo = $1', [correo_nuevo]);
      if (ocupado.rowCount) throw new ErrorHttp(409, 'Ese correo ya está registrado');

      const emitido = await codigos.emitir({ usuarioId, proposito: 'cambio_correo', destino: correo_nuevo });
      try {
        await correo.enviar({ para: correo_nuevo, ...plantillas.codigoCambioCorreo(emitido.codigo) });
      } catch (e) {
        await codigos.anular(emitido.id);
        throw e;
      }
      // Aviso al correo anterior: si no fue el dueño, se entera. Si falla, no tumba el trámite.
      await correo.enviar({ para: u.correo, ...plantillas.avisoCambioSolicitado(correo_nuevo) }).catch(() => {});

      return {
        mensaje: 'Te enviamos un código al correo nuevo',
        expira_en: emitido.expira_en,
        reenvio_segundos: CODIGO.reenvioSegundos,
      };
    },

    async confirmar(usuarioId, { codigo }) {
      const { destino } = await codigos.consumir({ usuarioId, proposito: 'cambio_correo', codigo });
      const { rows: [previo] } = await pool.query('SELECT correo FROM usuarios WHERE id = $1', [usuarioId]);

      try {
        await pool.query('UPDATE usuarios SET correo = $2, correo_verificado = TRUE WHERE id = $1', [usuarioId, destino]);
      } catch (e) {
        // Otro usuario tomó el correo entre la solicitud y la confirmación.
        if (e.code === '23505') throw new ErrorHttp(409, 'Ese correo ya está registrado');
        throw e;
      }
      await correo.enviar({ para: previo.correo, ...plantillas.avisoCorreoCambiado(destino) }).catch(() => {});
      return { mensaje: 'Tu correo se actualizó', correo: destino };
    },
  };
}
