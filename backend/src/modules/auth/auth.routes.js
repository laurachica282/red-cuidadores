import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';

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
      `INSERT INTO usuarios (nombre, correo, clave_hash, rol)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), correo.trim().toLowerCase(), hash, rol]
    );
    res.status(201).json({ token: crearToken(r.rows[0]), usuario: publico(r.rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado' });
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
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

    res.json({ token: crearToken(u), usuario: publico(u) });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

export default router;