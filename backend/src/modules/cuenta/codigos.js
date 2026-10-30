import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { CODIGO } from './config.js';
import { ErrorHttp } from './errores.js';

// Códigos de 6 dígitos de un solo uso: vencen a los 10 min, se reenvían cada 60 s y
// admiten 5 intentos. En la base solo queda el HMAC; con 10^6 combinaciones un hash
// simple se rompería al instante si se filtrara la tabla.

export const generarCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function hashCodigo(codigo, usuarioId, proposito) {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) throw new Error('Falta JWT_SECRET en el .env');
  return createHmac('sha256', secreto).update(`${usuarioId}:${proposito}:${codigo}`).digest('hex');
}

const iguales = (a, b) => {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
};

export function crearCodigos(pool) {
  const vigente = async (usuarioId, proposito) => {
    const r = await pool.query(
      `SELECT * FROM cuenta_codigos
        WHERE usuario_id = $1 AND proposito = $2 AND usado_en IS NULL AND expira_en > NOW()
        ORDER BY creado_en DESC LIMIT 1`,
      [usuarioId, proposito],
    );
    return r.rows[0] ?? null;
  };

  return {
    vigente,

    // Crea un código nuevo e invalida el anterior. Devuelve el código en claro (solo para enviarlo).
    async emitir({ usuarioId, proposito, destino }) {
      const previo = await vigente(usuarioId, proposito);
      if (previo) {
        const espera = CODIGO.reenvioSegundos - (Date.now() - previo.creado_en.getTime()) / 1000;
        if (espera > 0) {
          throw new ErrorHttp(429, `Espera ${Math.ceil(espera)} s para pedir otro código`, { espera_segundos: Math.ceil(espera) });
        }
      }
      const codigo = generarCodigo();
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        await cliente.query(
          `UPDATE cuenta_codigos SET usado_en = NOW()
            WHERE usuario_id = $1 AND proposito = $2 AND usado_en IS NULL`,
          [usuarioId, proposito],
        );
        const r = await cliente.query(
          `INSERT INTO cuenta_codigos (usuario_id, proposito, destino, codigo_hash, expira_en)
           VALUES ($1, $2, $3, $4, NOW() + make_interval(mins => $5))
           RETURNING id, expira_en`,
          [usuarioId, proposito, destino, hashCodigo(codigo, usuarioId, proposito), CODIGO.vigenciaMinutos],
        );
        await cliente.query('COMMIT');
        return { codigo, id: r.rows[0].id, expira_en: r.rows[0].expira_en };
      } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
      } finally {
        cliente.release();
      }
    },

    // Descarta un código que no se pudo enviar, para no dejar uno vigente que nadie recibió.
    async anular(id) {
      await pool.query('UPDATE cuenta_codigos SET usado_en = NOW() WHERE id = $1', [id]);
    },

    // Comprueba y consume el código. Cada intento se cuenta ANTES de comparar, con un UPDATE
    // atómico: dos peticiones en paralelo no pueden pasarse del límite de intentos.
    async consumir({ usuarioId, proposito, codigo }) {
      const activo = await vigente(usuarioId, proposito);
      if (!activo) throw new ErrorHttp(400, 'El código venció o no existe. Pide uno nuevo');

      const intento = await pool.query(
        `UPDATE cuenta_codigos SET intentos = intentos + 1
          WHERE id = $1 AND usado_en IS NULL AND intentos < $2
          RETURNING intentos`,
        [activo.id, CODIGO.maxIntentos],
      );
      if (!intento.rows[0]) {
        throw new ErrorHttp(429, 'Demasiados intentos. Pide un código nuevo');
      }

      if (!iguales(hashCodigo(codigo, usuarioId, proposito), activo.codigo_hash)) {
        const restantes = CODIGO.maxIntentos - intento.rows[0].intentos;
        throw new ErrorHttp(400, restantes > 0
          ? `Código incorrecto. Te quedan ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}`
          : 'Código incorrecto. Pide un código nuevo', { intentos_restantes: restantes });
      }

      const usado = await pool.query(
        'UPDATE cuenta_codigos SET usado_en = NOW() WHERE id = $1 AND usado_en IS NULL RETURNING destino',
        [activo.id],
      );
      if (!usado.rows[0]) throw new ErrorHttp(400, 'El código venció o no existe. Pide uno nuevo');
      return { destino: usado.rows[0].destino };
    },
  };
}
