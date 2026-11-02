import bcrypt from 'bcrypt';
import { ErrorHttp } from '../errores.js';
import { plantillas } from '../plantillas.js';
import { CODIGO } from '../config.js';

// Cierre de cuenta con paz y salvo: HU-37 (ver pendientes), HU-39 (desactivar) y HU-40 (reactivar).
// RN-4: no se cierra con pendientes. RN-5: nunca se borra nada, solo status = false.
export function crearCierreService({ pool, codigos, correo, integraciones, log = console }) {
  const avisar = (para, plantilla) =>
    correo.enviar({ para, ...plantilla }).catch((e) => log.error(`Aviso no enviado: ${e.message}`));

  const enTransaccion = async (fn) => {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const r = await fn(cliente);
      await cliente.query('COMMIT');
      return r;
    } catch (e) {
      await cliente.query('ROLLBACK');
      throw e;
    } finally {
      cliente.release();
    }
  };

  const pendientes = async (usuario) => {
    const verificaciones = await integraciones.verificacionesPazYSalvo(usuario);
    const lista = verificaciones.filter((v) => v.cantidad > 0);
    return { puede_cerrar: lista.length === 0, pendientes: lista, verificaciones };
  };

  return {
    // HU-37
    pendientes,

    // HU-39
    async desactivar(usuarioId, { clave, motivo, detalle }) {
      const u = await enTransaccion(async (db) => {
        const { rows: [u] } = await db.query(
          'SELECT id, rol, status, correo, clave_hash FROM usuarios WHERE id = $1 FOR UPDATE',
          [usuarioId],
        );
        if (!u || !u.status) throw new ErrorHttp(409, 'Tu cuenta ya está desactivada');
        if (!(await bcrypt.compare(clave, u.clave_hash))) throw new ErrorHttp(403, 'La contraseña no es correcta');

        // Se vuelve a validar aquí: lo que mostró la pantalla pudo cambiar mientras tanto.
        const estado = await pendientes({ usuarioId: u.id, rol: u.rol });
        if (!estado.puede_cerrar) {
          throw new ErrorHttp(409, 'No puedes desactivar la cuenta mientras tengas pendientes', { pendientes: estado.pendientes });
        }

        // Si fuera el último administrador, nadie podría atender los reportes ni las verificaciones.
        if (u.rol === 'admin') {
          const otros = await db.query(
            "SELECT 1 FROM usuarios WHERE rol = 'admin' AND status AND id <> $1 LIMIT 1", [u.id],
          );
          if (!otros.rowCount) throw new ErrorHttp(409, 'Eres el único administrador: nombra otro antes de desactivar tu cuenta');
        }

        await db.query(
          `UPDATE usuarios SET status = FALSE, motivo_desactivacion = $2, desactivado_en = NOW() WHERE id = $1`,
          [u.id, motivo],
        );
        await db.query(
          `INSERT INTO cuenta_eventos (usuario_id, evento, origen, motivo, detalle)
           VALUES ($1, 'desactivada', 'usuario', $2, $3)`,
          [u.id, motivo, detalle ?? null],
        );
        return u;
      });

      // La cuenta ya no entra (autenticar.js mira status en cada petición); además se avisa
      // al módulo de sesiones para que cierre los dispositivos (HU-08).
      await Promise.resolve(integraciones.cerrarSesiones(u.id)).catch((e) => log.error(`No se cerraron las sesiones: ${e.message}`));
      await avisar(u.correo, plantillas.avisoDesactivada());
      return { mensaje: 'Tu cuenta quedó desactivada. Tus datos se conservan.' };
    },

    // Suspensión por un administrador (HU-14). Queda en el historial con origen 'admin',
    // y por eso la persona NO puede reactivarse sola con HU-40.
    async suspender({ usuarioId, adminId, detalle }) {
      return enTransaccion(async (db) => {
        const r = await db.query(
          `UPDATE usuarios SET status = FALSE, motivo_desactivacion = 'suspension', desactivado_en = NOW()
            WHERE id = $1 AND status RETURNING id`,
          [usuarioId],
        );
        if (!r.rowCount) throw new ErrorHttp(409, 'La cuenta ya estaba desactivada');
        await db.query(
          `INSERT INTO cuenta_eventos (usuario_id, evento, origen, motivo, detalle, admin_id)
           VALUES ($1, 'desactivada', 'admin', 'suspension', $2, $3)`,
          [usuarioId, detalle ?? null, adminId],
        );
        return { usuario_id: usuarioId };
      });
    },

    // HU-40, paso 1. Responde lo mismo exista o no la cuenta, como HU-04.
    async solicitarReactivacion({ correo: direccion }) {
      const generica = {
        mensaje: 'Si existe una cuenta desactivada con ese correo, te enviamos un código',
        reenvio_segundos: CODIGO.reenvioSegundos,
      };
      const u = await cuentaReactivable(pool, direccion);
      if (!u) return generica;

      let emitido;
      try {
        emitido = await codigos.emitir({ usuarioId: u.id, proposito: 'reactivacion', destino: u.correo });
      } catch (e) {
        if (e instanceof ErrorHttp && e.estado === 429) return generica; // pidió otro hace menos de 60 s
        throw e;
      }
      try {
        await correo.enviar({ para: u.correo, ...plantillas.codigoReactivacion(emitido.codigo) });
      } catch (e) {
        await codigos.anular(emitido.id);
        log.error(`Código de reactivación no enviado: ${e.message}`);
      }
      return generica;
    },

    // HU-40, paso 2.
    async confirmarReactivacion({ correo: direccion, codigo }) {
      // Todos los fallos se ven igual por fuera, exista o no la cuenta.
      const invalido = new ErrorHttp(400, 'El código es incorrecto o venció. Pide uno nuevo');
      const u = await cuentaReactivable(pool, direccion);
      if (!u) throw invalido;

      try {
        await codigos.consumir({ usuarioId: u.id, proposito: 'reactivacion', codigo });
      } catch (e) {
        if (e instanceof ErrorHttp && e.estado < 500) throw invalido;
        throw e;
      }

      await enTransaccion(async (db) => {
        // El historial conserva el motivo; en la fila queda limpia para la próxima vez.
        await db.query(
          'UPDATE usuarios SET status = TRUE, motivo_desactivacion = NULL, desactivado_en = NULL WHERE id = $1',
          [u.id],
        );
        await db.query("INSERT INTO cuenta_eventos (usuario_id, evento, origen) VALUES ($1, 'reactivada', 'usuario')", [u.id]);
      });

      // Un cuidador con antecedentes vencidos vuelve a la cuenta, pero no aparece en la
      // búsqueda hasta renovarlos (RN-3, lo aplica la búsqueda).
      const vigentes = u.rol === 'cuidador' ? await integraciones.antecedentesVigentes(u.id) : true;
      await avisar(u.correo, plantillas.avisoReactivada());
      return {
        mensaje: 'Tu cuenta está activa de nuevo. Ya puedes iniciar sesión.',
        requiere_renovar_antecedentes: vigentes === false,
      };
    },
  };
}

// Solo se reactiva lo que el propio usuario desactivó. Una cuenta suspendida por un
// administrador (o desactivada por otra vía) no se puede reactivar con un código.
async function cuentaReactivable(db, correo) {
  const { rows: [u] } = await db.query(
    `SELECT u.id, u.correo, u.rol
       FROM usuarios u
      WHERE u.correo = $1 AND u.status = FALSE
        AND (SELECT e.origen FROM cuenta_eventos e
              WHERE e.usuario_id = u.id AND e.evento = 'desactivada'
              ORDER BY e.creado_en DESC, e.id DESC LIMIT 1) = 'usuario'`,
    [correo],
  );
  return u ?? null;
}
