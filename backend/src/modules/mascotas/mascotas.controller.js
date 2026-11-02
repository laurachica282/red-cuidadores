import { pool } from '../../db.js';

const ESPECIES = ['perro', 'gato', 'ave', 'conejo', 'roedor', 'reptil', 'otro'];
const rutaArchivo = (file) => (file ? `/uploads/mascotas/${file.filename}` : null);

// ---------- Validación de la ficha (HU-23) ----------
function leerFicha(body) {
  const errores = [];
  const nombre = (body.nombre || '').trim();
  const especie = (body.especie || '').trim().toLowerCase();
  const edad = body.edad_meses === '' || body.edad_meses == null ? null : Number(body.edad_meses);
  const peso = body.peso_kg === '' || body.peso_kg == null ? null : Number(body.peso_kg);

  if (!nombre) errores.push('El nombre es obligatorio');
  if (!ESPECIES.includes(especie)) errores.push('Especie no válida');
  if (edad !== null && (!Number.isInteger(edad) || edad < 0 || edad > 600))
    errores.push('La edad (en meses) no es válida');
  if (peso !== null && (!(peso > 0) || peso > 200)) errores.push('El peso no es válido');

  return {
    errores,
    datos: {
      nombre,
      especie,
      raza: (body.raza || '').trim() || null,
      edad_meses: edad,
      peso_kg: peso,
      vacunas: (body.vacunas || '').trim() || null,
      microchip: (body.microchip || '').trim() || null,
      indicaciones_medicas: (body.indicaciones_medicas || '').trim() || null,
    },
  };
}

// ---------- Crear ----------
export async function crear(req, res) {
  const { errores, datos } = leerFicha(req.body);
  if (errores.length) return res.status(400).json({ error: errores.join('. ') });

  try {
    const { rows } = await pool.query(
      `INSERT INTO mascotas
         (usuario_id, nombre, especie, raza, edad_meses, peso_kg,
          vacunas, microchip, indicaciones_medicas, foto_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [req.usuario.id, datos.nombre, datos.especie, datos.raza, datos.edad_meses,
       datos.peso_kg, datos.vacunas, datos.microchip, datos.indicaciones_medicas,
       rutaArchivo(req.file)]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo guardar la mascota' });
  }
}

// ---------- Listar (solo las del usuario, activas) ----------
export async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM mascotas
       WHERE usuario_id = $1 AND status = true
       ORDER BY creado_en DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar las mascotas' });
  }
}

// ---------- Ver una ----------
export async function obtener(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM mascotas WHERE id = $1 AND usuario_id = $2 AND status = true`,
      [req.params.id, req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mascota no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar la mascota' });
  }
}

// ---------- Editar ----------
export async function editar(req, res) {
  const { errores, datos } = leerFicha(req.body);
  if (errores.length) return res.status(400).json({ error: errores.join('. ') });

  try {
    const { rows } = await pool.query(
      `UPDATE mascotas SET
         nombre=$1, especie=$2, raza=$3, edad_meses=$4, peso_kg=$5,
         vacunas=$6, microchip=$7, indicaciones_medicas=$8,
         foto_url = COALESCE($9, foto_url)
       WHERE id=$10 AND usuario_id=$11 AND status=true
       RETURNING *`,
      [datos.nombre, datos.especie, datos.raza, datos.edad_meses, datos.peso_kg,
       datos.vacunas, datos.microchip, datos.indicaciones_medicas,
       rutaArchivo(req.file), req.params.id, req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mascota no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar la mascota' });
  }
}

// ---------- "Eliminar" = borrado lógico (RN-5) ----------
export async function desactivar(req, res) {
  try {
    // Más adelante: bloquear si la mascota tiene una reserva activa
    const { rowCount } = await pool.query(
      `UPDATE mascotas SET status=false
       WHERE id=$1 AND usuario_id=$2 AND status=true`,
      [req.params.id, req.usuario.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Mascota no encontrada' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar la mascota' });
  }
}

// ---------- Marcar como fina (HU-24) ----------
export async function marcarFina(req, res) {
  const valor = Number(req.body.valor_estimado);
  if (!(valor > 0)) return res.status(400).json({ error: 'El valor estimado es obligatorio' });
  if (!req.file) return res.status(400).json({ error: 'Debes adjuntar el comprobante' });

  try {
    const { rows } = await pool.query(
      `UPDATE mascotas
       SET es_fina = true, valor_estimado = $1, comprobante_url = $2
       WHERE id=$3 AND usuario_id=$4 AND status=true
       RETURNING *`,
      [valor, rutaArchivo(req.file), req.params.id, req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mascota no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo marcar la mascota como fina' });
  }
}
