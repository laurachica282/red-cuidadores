import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';
import { enviarAvisoCambioClave, enviarCodigo } from './correo.service.js';
import { crearCodigo, segundosParaReenviar, verificarCodigo } from './codigos.service.js';
import { cerrarSesiones, crearSesion, describirDispositivo, DIAS_SESION } from './sesiones.service.js';
import { confiarDispositivo, esConfiable, hashDispositivo, olvidarDispositivos } from './dispositivos.service.js';
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

// sid: id de la fila en sesiones; verificarToken rechaza el token si esa sesión se cerró.
const crearToken = (u, sid) =>
  jwt.sign({ id: u.id, rol: u.rol, sid }, process.env.JWT_SECRET, { expiresIn: `${DIAS_SESION}d` });

// Token de un solo paso para cambiar la clave; no sirve como sesión (ver verificarToken).
const crearTokenRestablecer = (u) =>
  jwt.sign({ id: u.id, proposito: 'restablecer' }, process.env.JWT_SECRET, { expiresIn: '10m' });

// Token del paso intermedio del login con verificación en dos pasos; dh: hash del dispositivo que se va a confiar.
const crearToken2fa = (u, hash) =>
  jwt.sign({ id: u.id, proposito: '2fa', dh: hash }, process.env.JWT_SECRET, { expiresIn: '10m' });

const token2faInvalido = (res) =>
  res.status(400).json({ error: 'El código venció. Inicia sesión de nuevo.', codigo: 'TOKEN_INVALIDO' });

// Devuelve { u, hash } si el token2fa es válido, la cuenta sigue activa y la clave no cambió después; si no, null.
const leerToken2fa = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
  if (payload?.proposito !== '2fa' || !payload.dh) return null;

  const r = await pool.query(
    'SELECT *, FLOOR(EXTRACT(EPOCH FROM clave_cambiada_en))::bigint AS cambio FROM usuarios WHERE id = $1',
    [payload.id]
  );
  const u = r.rows[0];
  if (!u?.status || (u.cambio !== null && payload.iat < Number(u.cambio))) return null;
  return { u, hash: payload.dh };
};

// Manda el código 2FA salvo que se haya enviado uno hace menos de 60 s (ese sigue vigente).
const enviarCodigo2fa = async (u) => {
  if ((await segundosParaReenviar(u.id, '2fa')) > 0) return;
  try {
    await enviarCodigo(u.correo, u.nombre, await crearCodigo(u.id, '2fa'), '2fa');
  } catch (e) {
    console.error('No se pudo enviar el código:', e.message);
  }
};

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
  pais: u.pais, idioma: u.idioma, moneda: u.moneda, dos_pasos: u.dos_pasos,
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
      `INSERT INTO usuarios (nombre, correo, clave_hash, rol, correo_verificado, dos_pasos)
       VALUES ($1, $2, $3, $4, FALSE, $5) RETURNING *`,
      [nombre.trim(), correo.trim().toLowerCase(), hash, rol, rol === 'cuidador']
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
  const { correo, clave, dispositivoId } = req.body;
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

    // Equipo nuevo con verificación en dos pasos: aún no hay sesión, primero el código.
    if (u.dos_pasos) {
      const hash = hashDispositivo(dispositivoId);
      if (!hash) return res.status(400).json({ error: 'No pudimos identificar este dispositivo' });
      if (!(await esConfiable(u.id, hash))) {
        await enviarCodigo2fa(u);
        return res.json({ requiere2fa: true, token2fa: crearToken2fa(u, hash) });
      }
    }

    res.json({ token: crearToken(u, await crearSesion(u.id, req)), usuario: publico(u) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

router.post('/2fa/verificar', async (req, res) => {
  const { token2fa, codigo } = req.body;
  if (!token2fa) return token2faInvalido(res);
  if (!/^\d{6}$/.test(codigo ?? '')) return res.status(400).json({ error: 'Escribe el código de 6 dígitos' });

  try {
    const t = await leerToken2fa(token2fa);
    if (!t) return token2faInvalido(res);

    const v = await verificarCodigo(t.u.id, '2fa', codigo);
    if (!v.ok) return responderFalloCodigo(res, v);

    await confiarDispositivo(t.u.id, t.hash);
    res.json({ token: crearToken(t.u, await crearSesion(t.u.id, req)), usuario: publico(t.u) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo verificar el código' });
  }
});

router.post('/2fa/reenviar', async (req, res) => {
  const { token2fa } = req.body;
  if (!token2fa) return token2faInvalido(res);

  try {
    const t = await leerToken2fa(token2fa);
    if (!t) return token2faInvalido(res);

    const faltan = await segundosParaReenviar(t.u.id, '2fa');
    if (faltan > 0) {
      return res.status(429).json({ error: `Espera ${faltan} segundos para pedir otro código`, segundos: faltan });
    }

    await enviarCodigo(t.u.correo, t.u.nombre, await crearCodigo(t.u.id, '2fa'), '2fa');
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo enviar el código' });
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
    await cerrarSesiones(payload.id);
    await olvidarDispositivos(payload.id);
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
    if (cerrarOtras) await cerrarSesiones(u.id, { excepto: req.usuario.sid });

    try {
      await enviarAvisoCambioClave(u.correo, u.nombre);
    } catch (e) {
      console.error('No se pudo enviar el aviso de cambio de contraseña:', e.message);
    }

    // El token nuevo (misma sesión) mantiene activa esta sesión; los anteriores quedan invalidados.
    res.json(cerrarOtras ? { ok: true, token: crearToken(u, req.usuario.sid), usuario: publico(u) } : { ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
});

router.patch('/2fa', verificarToken, async (req, res) => {
  const { activo, clave, dispositivoId } = req.body;
  if (typeof activo !== 'boolean' || !clave) return res.status(400).json({ error: 'Faltan datos' });

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

    // El rol se lee de la base, no del token.
    if (!activo && u.rol === 'cuidador') {
      return res.status(403).json({
        error: 'La verificación en dos pasos es obligatoria para cuidadores',
        codigo: '2FA_OBLIGATORIO',
      });
    }

    if (u.bloqueada) return res.status(423).json(respuestaBloqueo(u.minutos_bloqueo));

    // La clave equivocada cuenta como intento fallido, igual que en el login.
    if (!(await bcrypt.compare(clave, u.clave_hash))) {
      if (await registrarFalloClave(u.id)) return res.status(423).json(respuestaBloqueo(MINUTOS_BLOQUEO));
      return res.status(401).json({ error: 'La contraseña es incorrecta' });
    }

    if (u.intentos_fallidos > 0 || u.bloqueado_hasta) {
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [u.id]);
    }

    const hash = activo ? hashDispositivo(dispositivoId) : null;
    if (activo && !hash) return res.status(400).json({ error: 'No pudimos identificar este dispositivo' });

    await pool.query('UPDATE usuarios SET dos_pasos = $2, actualizado_en = NOW() WHERE id = $1', [u.id, activo]);
    // Al activarla, este equipo queda confiable; al desactivarla se olvidan todos para no reactivar equipos viejos.
    if (activo) await confiarDispositivo(u.id, hash);
    else await olvidarDispositivos(u.id);

    res.json({ ok: true, usuario: publico({ ...u, dos_pasos: activo }) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo cambiar la verificación en dos pasos' });
  }
});

router.post('/logout', verificarToken, async (req, res) => {
  try {
    await pool.query('UPDATE sesiones SET cerrada_en = NOW() WHERE id = $1 AND cerrada_en IS NULL', [req.usuario.sid]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo cerrar la sesión' });
  }
});

// Solo las abiertas cuyo token aún no venció, la más reciente primero.
router.get('/sesiones', verificarToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, dispositivo, user_agent, ciudad, ultima_actividad
         FROM sesiones
        WHERE usuario_id = $1 AND cerrada_en IS NULL AND creado_en > NOW() - make_interval(days => $2)
        ORDER BY ultima_actividad DESC`,
      [req.usuario.id, DIAS_SESION]
    );
    const sesiones = r.rows.map((s) => {
      const { so, tipo } = describirDispositivo(s.user_agent ?? '');
      return {
        id: s.id, dispositivo: s.dispositivo, so, tipo, ciudad: s.ciudad,
        ultimaActividad: s.ultima_actividad, actual: String(s.id) === String(req.usuario.sid),
      };
    });
    res.json({ sesiones });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudieron cargar tus sesiones' });
  }
});

router.post('/sesiones/cerrar-todas', verificarToken, async (req, res) => {
  try {
    const cerradas = await cerrarSesiones(req.usuario.id, { excepto: req.usuario.sid });
    res.json({ ok: true, cerradas });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudieron cerrar las sesiones' });
  }
});

// Mismo 404 si no existe, ya está cerrada o es de otro usuario, para no revelar sesiones ajenas.
router.delete('/sesiones/:id', verificarToken, async (req, res) => {
  const noEncontrada = () => res.status(404).json({ error: 'No encontramos esa sesión' });
  if (!/^\d{1,18}$/.test(req.params.id)) return noEncontrada();

  try {
    const r = await pool.query(
      'UPDATE sesiones SET cerrada_en = NOW() WHERE id = $1 AND usuario_id = $2 AND cerrada_en IS NULL',
      [req.params.id, req.usuario.id]
    );
    if (r.rowCount === 0) return noEncontrada();
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo cerrar la sesión' });
  }
});

export default router;