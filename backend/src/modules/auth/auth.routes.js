import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';
import { enviarAvisoCambioClave, enviarCodigo } from './correo.service.js';
import { crearCodigo, segundosParaReenviar, verificarCodigo } from './codigos.service.js';
import { verificarToken } from './verificarToken.js';

const router = Router();
const CLAVE_VALIDA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15; // debe coincidir con el INTERVAL del UPDATE de /login

const respuestaBloqueo = (minutos) => ({
  error: `Demasiados intentos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
  codigo: 'CUENTA_BLOQUEADA',
  minutos,
});

// Suma un intento fallido; al quinto bloquea la cuenta. Devuelve true si quedó bloqueada.
const registrarFalloClave = async (id) => {
  const f = await pool.query(
    `UPDATE usuarios SET
       intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= $2 THEN 0 ELSE intentos_fallidos + 1 END,
       bloqueado_hasta   = CASE WHEN intentos_fallidos + 1 >= $2 THEN NOW() + INTERVAL '15 minutes' ELSE bloqueado_hasta END
     WHERE id = $1
     RETURNING COALESCE(bloqueado_hasta > NOW(), FALSE) AS bloqueada`,
    [id, MAX_INTENTOS]
  );
  return f.rows[0].bloqueada;
};

const crearToken =(u) =>
  jwt.sign({ id: u.id, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Token de un solo paso para cambiar la clave; no sirve como sesión (ver verificarToken).
const crearTokenRestablecer = (u) =>
  jwt.sign({ id: u.id, proposito: 'restablecer' }, process.env.JWT_SECRET, { expiresIn: '10m' });

const responderFalloCodigo = (res, v) => {
  if (v.motivo === 'intentos') {
    return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' });
  }
  if (v.motivo === 'vencido') {
    return res.status(400).json({ error: 'El código venció. Pide uno nuevo.' });
  }
  return res.status(400).json({
    error: `Código incorrecto. Te quedan ${v.intentosRestantes} ${v.intentosRestantes === 1 ? 'intento' : 'intentos'}.`,
  });
};

// Solo lo que el frontend puede ver (nunca la clave cifrada).
const publico = (u) => ({
  id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol,
  pais: u.pais, idioma: u.idioma, moneda: u.moneda,
});

router.post('/registro', async (req, res) => {
  const { nombre, correo, clave, rol = 'viajero' } = req.body;

  if (!nombre?.trim() || !correo?.trim() || !clave) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  if (!['viajero', 'cuidador'].includes(rol)) {
    return res.status(400).json({ error: 'Tipo de cuenta no válido' });
  }
  if (!CLAVE_VALIDA.test(clave)) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número' });
  }

  try {
    const hash = await bcrypt.hash(clave, 10);
    const r = await pool.query(
      `INSERT INTO usuarios (nombre, correo, clave_hash, rol, correo_verificado)
       VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
      [nombre.trim(), correo.trim().toLowerCase(), hash, rol]
    );
    const u = r.rows[0];

    // Si el envío falla la cuenta ya existe: el usuario puede pedir el reenvío.
    try {
      await enviarCodigo(u.correo, u.nombre, await crearCodigo(u.id, 'registro'));
    } catch (e) {
      console.error('No se pudo enviar el código:', e.message);
    }
    res.status(201).json({ requiereVerificacion: true, correo: u.correo });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado' });
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
});

router.post('/verificar-correo', async (req, res) => {
  const { correo, codigo } = req.body;
  if (!correo?.trim() || !/^\d{6}$/.test(codigo ?? '')) {
    return res.status(400).json({ error: 'Escribe el código de 6 dígitos' });
  }

  try {
    const r = await pool.query('SELECT id, correo_verificado FROM usuarios WHERE correo = $1', [correo.trim().toLowerCase()]);
    const u = r.rows[0];
    if (!u) return res.status(400).json({ error: 'El código es incorrecto o venció' });
    if (u.correo_verificado) return res.json({ ok: true });

    const v = await verificarCodigo(u.id, 'registro', codigo);
    if (!v.ok) return responderFalloCodigo(res, v);

    await pool.query('UPDATE usuarios SET correo_verificado = TRUE, actualizado_en = NOW() WHERE id = $1', [u.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo verificar el correo' });
  }
});

router.post('/reenviar-codigo', async (req, res) => {
  const { correo } = req.body;
  if (!correo?.trim()) return res.status(400).json({ error: 'Falta el correo' });

  try {
    const r = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo.trim().toLowerCase()]);
    const u = r.rows[0];

    // Misma respuesta si no existe o ya está verificado, para no revelar qué correos hay.
    if (!u || u.correo_verificado) return res.json({ ok: true });

    const faltan = await segundosParaReenviar(u.id, 'registro');
    if (faltan > 0) {
      return res.status(429).json({ error: `Espera ${faltan} segundos para pedir otro código`, segundos: faltan });
    }

    await enviarCodigo(u.correo, u.nombre, await crearCodigo(u.id, 'registro'));
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo enviar el código' });
  }
});

router.post('/login', async (req, res) => {
  const { correo, clave } = req.body;
  if (!correo || !clave) {
    return res.status(400).json({ error: 'Escribe tu correo y tu contraseña' });
  }

  try {
    const r = await pool.query(
      `SELECT *,
              COALESCE(bloqueado_hasta > NOW(), FALSE) AS bloqueada,
              CEIL(EXTRACT(EPOCH FROM (bloqueado_hasta - NOW())) / 60)::int AS minutos_bloqueo
       FROM usuarios WHERE correo = $1`,
      [correo.trim().toLowerCase()]
    );
    const u = r.rows[0];

    // Cuenta bloqueada: ni se compara la clave.
    if (u?.bloqueada) return res.status(423).json(respuestaBloqueo(u.minutos_bloqueo));

    const coincide = u && (await bcrypt.compare(clave, u.clave_hash));

    // Mismo mensaje si falla el correo o la clave, para no dar pistas.
    if (!coincide) {
      if (u && (await registrarFalloClave(u.id))) {
        return res.status(423).json(respuestaBloqueo(MINUTOS_BLOQUEO));
      }
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    if (u.intentos_fallidos > 0 || u.bloqueado_hasta) {
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [u.id]);
    }
    if (!u.status) return res.status(403).json({ error: 'Esta cuenta está desactivada' });
    if (!u.correo_verificado) {
      return res.status(403).json({ error: 'Debes verificar tu correo para ingresar', codigo: 'CORREO_SIN_VERIFICAR' });
    }

    res.json({ token: crearToken(u), usuario: publico(u) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

// Responde siempre igual, exista o no el correo, para no revelar qué cuentas hay.
router.post('/recuperar', async (req, res) => {
  const { correo } = req.body;
  if (!correo?.trim()) return res.status(400).json({ error: 'Escribe tu correo' });

  const respuesta = { ok: true, mensaje: 'Si el correo está registrado, recibirás un código en unos minutos.' };

  try {
    const r = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo.trim().toLowerCase()]);
    const u = r.rows[0];

    // Dentro de los 60 s no se reenvía, pero tampoco se avisa (un 429 delataría que el correo existe).
    if (u?.status && (await segundosParaReenviar(u.id, 'recuperacion')) === 0) {
      try {
        await enviarCodigo(u.correo, u.nombre, await crearCodigo(u.id, 'recuperacion'), 'recuperacion');
      } catch (e) {
        console.error('No se pudo enviar el código:', e.message);
      }
    }
  } catch (e) {
    console.error(e.message);
  }
  res.json(respuesta);
});

router.post('/recuperar/verificar', async (req, res) => {
  const { correo, codigo } = req.body;
  if (!correo?.trim() || !/^\d{6}$/.test(codigo ?? '')) {
    return res.status(400).json({ error: 'Escribe el código de 6 dígitos' });
  }

  try {
    const r = await pool.query('SELECT id, status FROM usuarios WHERE correo = $1', [correo.trim().toLowerCase()]);
    const u = r.rows[0];
    if (!u?.status) return res.status(400).json({ error: 'El código es incorrecto o venció' });

    const v = await verificarCodigo(u.id, 'recuperacion', codigo);
    if (!v.ok) return responderFalloCodigo(res, v);

    res.json({ token: crearTokenRestablecer(u) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo verificar el código' });
  }
});

router.post('/restablecer-clave', async (req, res) => {
  const { token, clave } = req.body;
  if (!token || !clave) return res.status(400).json({ error: 'Faltan datos' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    payload = null;
  }
  if (payload?.proposito !== 'restablecer') {
    return res.status(400).json({ error: 'El enlace venció. Pide un código nuevo.', codigo: 'TOKEN_INVALIDO' });
  }
  if (!CLAVE_VALIDA.test(clave)) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número' });
  }

  try {
    const r = await pool.query(
      'SELECT status, FLOOR(EXTRACT(EPOCH FROM clave_cambiada_en))::bigint AS cambio FROM usuarios WHERE id = $1',
      [payload.id]
    );
    const u = r.rows[0];
    // Un token emitido antes del último cambio ya se usó: el restablecimiento es de un solo uso.
    if (!u?.status || (u.cambio !== null && payload.iat <= Number(u.cambio))) {
      return res.status(400).json({ error: 'El enlace venció. Pide un código nuevo.', codigo: 'TOKEN_INVALIDO' });
    }

    // Recibir el código prueba que el correo es suyo, por eso queda verificado.
    await pool.query(
      `UPDATE usuarios SET clave_hash = $2, clave_cambiada_en = NOW(), intentos_fallidos = 0,
              bloqueado_hasta = NULL, correo_verificado = TRUE, actualizado_en = NOW()
       WHERE id = $1`,
      [payload.id, await bcrypt.hash(clave, 10)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
});

router.post('/cambiar-clave', verificarToken, async (req, res) => {
  const { claveActual, claveNueva, cerrarOtras } = req.body;
  if (!claveActual || !claveNueva) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const r = await pool.query(
      `SELECT *,
              COALESCE(bloqueado_hasta > NOW(), FALSE) AS bloqueada,
              CEIL(EXTRACT(EPOCH FROM (bloqueado_hasta - NOW())) / 60)::int AS minutos_bloqueo
       FROM usuarios WHERE id = $1`,
      [req.usuario.id]
    );
    const u = r.rows[0];
    if (!u) return res.status(401).json({ error: 'Tu sesión no es válida o venció' });

    if (u.bloqueada) return res.status(423).json(respuestaBloqueo(u.minutos_bloqueo));

    // La clave actual equivocada cuenta como intento fallido, igual que en el login.
    if (!(await bcrypt.compare(claveActual, u.clave_hash))) {
      if (await registrarFalloClave(u.id)) return res.status(423).json(respuestaBloqueo(MINUTOS_BLOQUEO));
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    if (u.intentos_fallidos > 0 || u.bloqueado_hasta) {
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [u.id]);
    }

    if (!CLAVE_VALIDA.test(claveNueva)) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número' });
    }
    if (await bcrypt.compare(claveNueva, u.clave_hash)) {
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual', codigo: 'CLAVE_REPETIDA' });
    }

    // Solo si pide cerrar las otras sesiones se mueve clave_cambiada_en (ver verificarToken).
    await pool.query(
      `UPDATE usuarios SET clave_hash = $2, actualizado_en = NOW()
              ${cerrarOtras ? ', clave_cambiada_en = NOW()' : ''}
       WHERE id = $1`,
      [u.id, await bcrypt.hash(claveNueva, 10)]
    );

    try {
      await enviarAvisoCambioClave(u.correo, u.nombre);
    } catch (e) {
      console.error('No se pudo enviar el aviso de cambio de contraseña:', e.message);
    }

    // El token nuevo mantiene activa esta sesión; los anteriores quedan invalidados.
    res.json(cerrarOtras ? { ok: true, token: crearToken(u), usuario: publico(u) } : { ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
});

export default router;