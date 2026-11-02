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

// HU-34 / HU-35: el idioma y la moneda por defecto salen del país, pero la persona puede cambiarlos.
router.put('/mi-region', verificarToken, async (req, res) => {
  const pais = String(req.body.pais ?? '').toUpperCase();
  const reg = await pool.query('SELECT pais, idioma, moneda FROM regiones_reglas WHERE pais = $1 AND activa', [pais]);
  if (!reg.rows[0]) return res.status(400).json({ error: 'Ese país no está disponible' });

  const idioma = req.body.idioma ?? reg.rows[0].idioma;
  if (!IDIOMAS.includes(idioma)) return res.status(400).json({ error: 'Idioma no disponible' });

  const monedas = await pool.query('SELECT DISTINCT moneda FROM regiones_reglas WHERE activa');
  const moneda = String(req.body.moneda ?? reg.rows[0].moneda).toUpperCase();
  if (!monedas.rows.some((m) => m.moneda === moneda)) return res.status(400).json({ error: 'Moneda no disponible' });

  const r = await pool.query(
    `UPDATE usuarios SET pais = $2, idioma = $3, moneda = $4, actualizado_en = NOW()
     WHERE id = $1 RETURNING pais, idioma, moneda`,
    [req.usuario.id, pais, idioma, moneda]
  );
  res.json(r.rows[0]);
});

// HU-36: la búsqueda se limita a la región de quien consulta (solo cuidadores verificados y vigentes).
router.get('/cuidadores', verificarToken, async (req, res) => {
  const ciudad = String(req.query.ciudad ?? '').trim();
  const r = await pool.query(
    `SELECT v.usuario_id, v.nombre, v.ciudad, v.pais, v.tarifa_noche, v.tipos_mascota,
            v.antecedentes_verificados, g.moneda,
            (SELECT a.id FROM archivos_cuidador a
              WHERE a.usuario_id = v.usuario_id AND a.tipo = 'foto_espacio' AND a.activo
              ORDER BY a.id LIMIT 1) AS foto_id
     FROM cuidadores_visibles v
     JOIN regiones_reglas g ON g.pais = v.pais
     WHERE v.pais = (SELECT pais FROM usuarios WHERE id = $1)
       AND ($2 = '' OR v.ciudad ILIKE '%' || $2 || '%' OR v.nombre ILIKE '%' || $2 || '%')
     ORDER BY v.nombre`,
    [req.usuario.id, ciudad]
  );
  res.json(r.rows.map((c) => ({
    id: c.usuario_id, nombre: c.nombre, ciudad: c.ciudad, pais: c.pais,
    tarifaNoche: Number(c.tarifa_noche), moneda: c.moneda.trim(), tiposMascota: c.tipos_mascota,
    antecedentesVerificados: c.antecedentes_verificados, fotoId: c.foto_id,
  })));
});

export default router;
