import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';
import { enviarCodigo } from './correo.service.js';
import { crearCodigo, segundosParaReenviar, verificarCodigo } from './codigos.service.js';

const router = Router();
const CLAVE_VALIDA = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const crearToken = (u) =>
  jwt.sign({ id: u.id, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
    if (!v.ok) {
      if (v.motivo === 'intentos') {
        return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' });
      }
      if (v.motivo === 'vencido') {
        return res.status(400).json({ error: 'El código venció. Pide uno nuevo.' });
      }
      return res.status(400).json({
        error: `Código incorrecto. Te quedan ${v.intentosRestantes} ${v.intentosRestantes === 1 ? 'intento' : 'intentos'}.`,
      });
    }

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
    const r = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo.trim().toLowerCase()]);
    const u = r.rows[0];
    const coincide = u && (await bcrypt.compare(clave, u.clave_hash));

    // Mismo mensaje si falla el correo o la clave, para no dar pistas.
    if (!coincide) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
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

export default router;