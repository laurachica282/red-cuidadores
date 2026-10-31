import { Router } from 'express';
import { pool } from '../../db.js';
import { verificarToken } from '../auth/verificarToken.js';

const router = Router();
const IDIOMAS = ['es', 'en', 'pt'];

// Países disponibles (público: también sirve en el registro).
router.get('/paises', async (req, res) => {
  const r = await pool.query('SELECT pais, nombre, idioma, moneda FROM regiones_reglas WHERE activa ORDER BY nombre');
  res.json(r.rows);
});

// HU-36: términos legales según el país.
router.get('/terminos/:pais', async (req, res) => {
  const r = await pool.query(
    'SELECT pais, nombre, terminos_titulo, terminos FROM regiones_reglas WHERE pais = $1 AND activa',
    [String(req.params.pais).toUpperCase()]
  );
  const t = r.rows[0];
  if (!t) return res.status(404).json({ error: 'No hay términos para ese país' });
  res.json({ pais: t.pais, nombre: t.nombre, titulo: t.terminos_titulo, texto: t.terminos });
});

router.get('/mi-region', verificarToken, async (req, res) => {
  const r = await pool.query('SELECT pais, idioma, moneda FROM usuarios WHERE id = $1', [req.usuario.id]);
  res.json(r.rows[0]);
});

// HU-34: el idioma por defecto sale del país, pero la persona puede cambiarlo.
router.put('/mi-region', verificarToken, async (req, res) => {
  const pais = String(req.body.pais ?? '').toUpperCase();
  const reg = await pool.query('SELECT pais, idioma, moneda FROM regiones_reglas WHERE pais = $1 AND activa', [pais]);
  if (!reg.rows[0]) return res.status(400).json({ error: 'Ese país no está disponible' });
  const idioma = req.body.idioma ?? reg.rows[0].idioma;
  if (!IDIOMAS.includes(idioma)) return res.status(400).json({ error: 'Idioma no disponible' });

  const r = await pool.query(
    `UPDATE usuarios SET pais = $2, idioma = $3, moneda = $4, actualizado_en = NOW()
     WHERE id = $1 RETURNING pais, idioma, moneda`,
    [req.usuario.id, pais, idioma, reg.rows[0].moneda]
  );
  res.json(r.rows[0]);
});

export default router;
