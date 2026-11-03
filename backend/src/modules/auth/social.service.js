import { pool } from '../../db.js';
import { completarIngreso, respuestaBloqueo } from './ingreso.service.js';

// Base común del login social: cada proveedor solo verifica su token y llama a entrarConProveedor.

const SELECT_USUARIO = `
  SELECT u.*,
         COALESCE(u.bloqueado_hasta > NOW(), FALSE) AS bloqueada,
         CEIL(EXTRACT(EPOCH FROM (u.bloqueado_hasta - NOW())) / 60)::int AS minutos_bloqueo
    FROM usuarios u`;

const porCuentaSocial = async (proveedor, sub) => {
  const r = await pool.query(
    `${SELECT_USUARIO} JOIN cuentas_sociales c ON c.usuario_id = u.id WHERE c.proveedor = $1 AND c.sub = $2`,
    [proveedor, sub]
  );
  return r.rows[0];
};

const porCorreo = async (correo) => {
  const r = await pool.query(`${SELECT_USUARIO} WHERE u.correo = $1`, [correo]);
  return r.rows[0];
};

// Vincula la cuenta social a un usuario que ya existe; el proveedor confirmó el correo, así que queda verificado.
const vincular = async (u, proveedor, sub, correo) => {
  await pool.query(
    'INSERT INTO cuentas_sociales (usuario_id, proveedor, sub, correo) VALUES ($1, $2, $3, $4)',
    [u.id, proveedor, sub, correo]
  );
  if (!u.correo_verificado) {
    await pool.query('UPDATE usuarios SET correo_verificado = TRUE, actualizado_en = NOW() WHERE id = $1', [u.id]);
    u.correo_verificado = true;
  }
  return u;
};

// Usuario nuevo sin contraseña (puede crear una después) con su cuenta social, todo o nada.
const crearUsuario = async (proveedor, sub, correo, nombre) => {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const r = await cliente.query(
      `INSERT INTO usuarios (nombre, correo, clave_hash, rol, correo_verificado)
       VALUES ($1, $2, NULL, 'viajero', TRUE) RETURNING *, FALSE AS bloqueada`,
      [nombre, correo]
    );
    await cliente.query(
      'INSERT INTO cuentas_sociales (usuario_id, proveedor, sub, correo) VALUES ($1, $2, $3, $4)',
      [r.rows[0].id, proveedor, sub, correo]
    );
    await cliente.query('COMMIT');
    return r.rows[0];
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
};

// Encuentra (o crea) el usuario de la cuenta social. Devuelve el usuario o { http, cuerpo } si no se puede.
const resolverUsuario = async (proveedor, { sub, correo, nombre, correoVerificado }) => {
  const existente = await porCuentaSocial(proveedor, sub);
  if (existente) return existente;

  const conCorreo = await porCorreo(correo);
  if (conCorreo) {
    // Sin correo verificado por el proveedor no se vincula: alguien podría hacerse pasar por el dueño.
    if (!correoVerificado) {
      return { http: 409, cuerpo: { error: 'Ese correo ya está registrado. Inicia sesión con tu contraseña.' } };
    }
    return vincular(conCorreo, proveedor, sub, correo);
  }

  const nombreFinal = (nombre?.trim() || correo.split('@')[0]).slice(0, 120);
  return crearUsuario(proveedor, sub, correo, nombreFinal);
};

// perfil: { sub, correo, nombre, correoVerificado } ya validado por el proveedor.
// Devuelve { http, cuerpo } con la misma respuesta que /login (token y usuario, o requiere2fa).
export async function entrarConProveedor(proveedor, perfil, req, dispositivoId) {
  const datos = { ...perfil, correo: perfil.correo.trim().toLowerCase() };

  let u;
  try {
    u = await resolverUsuario(proveedor, datos);
  } catch (e) {
    // Dos peticiones a la vez crearon o vincularon la misma cuenta: la otra ya la dejó lista.
    if (e.code !== '23505') throw e;
    u = await porCuentaSocial(proveedor, datos.sub);
    if (!u) return { http: 409, cuerpo: { error: 'Ese correo ya está registrado. Inicia sesión con tu contraseña.' } };
  }
  if (u.http) return u;

  if (u.bloqueada) return { http: 423, cuerpo: respuestaBloqueo(u.minutos_bloqueo) };
  return completarIngreso(u, req, dispositivoId);
}
