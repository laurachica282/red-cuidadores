import { Router } from 'express';
import multer from 'multer';
import { pool } from '../../db.js';
import { verificarToken } from '../auth/verificarToken.js';
import { cifrar, descifrar } from './archivos.service.js';
import { notificar } from './notificar.js';

const router = Router();

const MAX_MB = 5;
const MAX_FOTOS = 8;
const TIPOS_MASCOTA = ['perro', 'gato', 'ave', 'conejo', 'otro'];
const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENTOS = [...IMAGENES, 'application/pdf'];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 6 } });

// Recibe archivos y devuelve un error claro si algo sale mal.
const recibir = (campos) => (req, res, next) =>
  upload.fields(campos)(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `Cada archivo debe pesar máximo ${MAX_MB} MB.` : 'No se pudieron recibir los archivos.';
    res.status(400).json({ error: msg });
  });

const soloRol = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol) ? next() : res.status(403).json({ error: 'No tienes permiso para esto' });

const esAdmin = [verificarToken, soloRol('admin')];
const esCuidador = [verificarToken, soloRol('cuidador')];

// Estado que ve el cuidador: si la aprobación ya venció, se muestra "vencido".
const estadoVisible = (v) => {
  if (!v) return 'sin_enviar';
  if (v.estado === 'aprobado' && new Date(v.vence_en) <= new Date()) return 'vencido';
  return v.estado;
};

const ultimaVerificacion = async (usuarioId) => {
  const r = await pool.query(
    `SELECT id, estado, motivo_rechazo, vence_en, creado_en, revisado_en
     FROM verificaciones_cuidador WHERE usuario_id = $1 ORDER BY id DESC LIMIT 1`,
    [usuarioId]
  );
  return r.rows[0];
};

/* ───────────── HU-10: perfil del cuidador ───────────── */

router.get('/mi-perfil', esCuidador, async (req, res) => {
  const id = req.usuario.id;
  const [perfil, fotos, ultima, visible] = await Promise.all([
    pool.query('SELECT descripcion, tarifa_noche, tipos_mascota FROM perfiles_cuidador WHERE usuario_id = $1', [id]),
    pool.query(`SELECT id FROM archivos_cuidador WHERE usuario_id = $1 AND tipo = 'foto_espacio' AND activo ORDER BY id`, [id]),
    ultimaVerificacion(id),
    pool.query('SELECT 1 FROM cuidadores_visibles WHERE usuario_id = $1', [id]),
  ]);
  const p = perfil.rows[0];
  res.json({
    perfil: p ? { descripcion: p.descripcion ?? '', tarifaNoche: Number(p.tarifa_noche), tiposMascota: p.tipos_mascota } : null,
    fotos: fotos.rows.map((f) => ({ id: f.id })),
    verificacion: ultima
      ? { estado: estadoVisible(ultima), motivoRechazo: ultima.motivo_rechazo, venceEn: ultima.vence_en, enviadaEn: ultima.creado_en }
      : { estado: 'sin_enviar' },
    visibleEnBusqueda: visible.rowCount > 0,
  });
});

router.put('/mi-perfil', esCuidador, async (req, res) => {
  const { descripcion = '', tarifaNoche, tiposMascota } = req.body;
  const tarifa = Number(tarifaNoche);
  if (!Number.isFinite(tarifa) || tarifa <= 0) return res.status(400).json({ error: 'Escribe una tarifa por noche mayor a 0' });
  if (!Array.isArray(tiposMascota) || tiposMascota.length === 0 || !tiposMascota.every((t) => TIPOS_MASCOTA.includes(t))) {
    return res.status(400).json({ error: 'Elige al menos un tipo de mascota' });
  }
  if (String(descripcion).length > 1000) return res.status(400).json({ error: 'La descripción es muy larga (máximo 1000 caracteres)' });

  await pool.query(
    `INSERT INTO perfiles_cuidador (usuario_id, descripcion, tarifa_noche, tipos_mascota)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id) DO UPDATE
       SET descripcion = $2, tarifa_noche = $3, tipos_mascota = $4, actualizado_en = NOW()`,
    [req.usuario.id, String(descripcion).trim(), tarifa, tiposMascota]
  );
  res.json({ ok: true });
});

router.post('/mi-perfil/fotos', esCuidador, recibir([{ name: 'fotos', maxCount: 6 }]), async (req, res) => {
  const archivos = req.files?.fotos ?? [];
  if (archivos.length === 0) return res.status(400).json({ error: 'Elige al menos una foto' });
  if (!archivos.every((f) => IMAGENES.includes(f.mimetype))) return res.status(400).json({ error: 'Las fotos deben ser JPG, PNG o WEBP' });

  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM archivos_cuidador WHERE usuario_id = $1 AND tipo = 'foto_espacio' AND activo`, [req.usuario.id]);
  if (rows[0].n + archivos.length > MAX_FOTOS) return res.status(400).json({ error: `Puedes tener máximo ${MAX_FOTOS} fotos` });

  for (const f of archivos) {
    await pool.query(`INSERT INTO archivos_cuidador (usuario_id, tipo, mime, datos) VALUES ($1, 'foto_espacio', $2, $3)`, [req.usuario.id, f.mimetype, f.buffer]);
  }
  res.status(201).json({ ok: true });
});

router.delete('/mi-perfil/fotos/:id', esCuidador, async (req, res) => {
  // No se borra: solo se oculta (RN-5).
  await pool.query(`UPDATE archivos_cuidador SET activo = FALSE WHERE id = $1 AND usuario_id = $2 AND tipo = 'foto_espacio'`, [req.params.id, req.usuario.id]);
  res.json({ ok: true });
});

// Las fotos del espacio son públicas (las ven los viajeros en el perfil).
router.get('/fotos/:id', async (req, res) => {
  const r = await pool.query(`SELECT mime, datos FROM archivos_cuidador WHERE id = $1 AND tipo = 'foto_espacio' AND activo`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).end();
  res.set('Content-Type', r.rows[0].mime).set('Cache-Control', 'public, max-age=3600').send(r.rows[0].datos);
});

// Perfil público con la insignia (HU-13). Solo existe si el cuidador es visible.
router.get('/publico/:id', async (req, res) => {
  const r = await pool.query('SELECT * FROM cuidadores_visibles WHERE usuario_id = $1', [req.params.id]);
  const c = r.rows[0];
  if (!c) return res.status(404).json({ error: 'Este cuidador no está disponible' });
  const fotos = await pool.query(`SELECT id FROM archivos_cuidador WHERE usuario_id = $1 AND tipo = 'foto_espacio' AND activo ORDER BY id`, [c.usuario_id]);
  res.json({
    id: c.usuario_id, nombre: c.nombre, ciudad: c.ciudad, pais: c.pais,
    tarifaNoche: Number(c.tarifa_noche), tiposMascota: c.tipos_mascota, descripcion: c.descripcion,
    antecedentesVerificados: true, antecedentesVencenEn: c.antecedentes_vencen_en,
    fotos: fotos.rows.map((f) => f.id),
  });
});

/* ───────────── HU-11: documentos y antecedentes ───────────── */

router.get('/verificacion', esCuidador, async (req, res) => {
  const v = await ultimaVerificacion(req.usuario.id);
  res.json(v
    ? { estado: estadoVisible(v), motivoRechazo: v.motivo_rechazo, venceEn: v.vence_en, enviadaEn: v.creado_en }
    : { estado: 'sin_enviar' });
});

const camposVerificacion = [{ name: 'documento', maxCount: 1 }, { name: 'selfie', maxCount: 1 }, { name: 'antecedentes', maxCount: 1 }];

router.post('/verificacion', esCuidador, recibir(camposVerificacion), async (req, res) => {
  const { documento, selfie, antecedentes } = req.files ?? {};
  if (!documento?.[0] || !selfie?.[0] || !antecedentes?.[0]) {
    return res.status(400).json({ error: 'Sube tu documento, una selfie y tu certificado de antecedentes' });
  }
  if (req.body.aceptaDatos !== 'true') return res.status(400).json({ error: 'Debes aceptar el tratamiento de tus datos personales' });
  if (!IMAGENES.includes(selfie[0].mimetype)) return res.status(400).json({ error: 'La selfie debe ser una imagen JPG, PNG o WEBP' });
  if (![documento[0], antecedentes[0]].every((f) => DOCUMENTOS.includes(f.mimetype))) {
    return res.status(400).json({ error: 'El documento y los antecedentes deben ser imagen o PDF' });
  }

  const ultima = await ultimaVerificacion(req.usuario.id);
  const estado = estadoVisible(ultima);
  if (estado === 'en_revision') return res.status(409).json({ error: 'Ya tienes una verificación en revisión' });
  if (estado === 'aprobado') return res.status(409).json({ error: 'Tus antecedentes ya están aprobados y vigentes' });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const v = await cliente.query(
      `INSERT INTO verificaciones_cuidador (usuario_id, acepta_datos) VALUES ($1, TRUE) RETURNING id`,
      [req.usuario.id]
    );
    for (const [tipo, f] of [['documento', documento[0]], ['selfie', selfie[0]], ['antecedentes', antecedentes[0]]]) {
      await cliente.query(
        `INSERT INTO archivos_cuidador (usuario_id, verificacion_id, tipo, mime, cifrado, datos) VALUES ($1, $2, $3, $4, TRUE, $5)`,
        [req.usuario.id, v.rows[0].id, tipo, f.mimetype, cifrar(f.buffer)]
      );
    }
    await cliente.query('COMMIT');
    res.status(201).json({ estado: 'en_revision' });
  } catch (e) {
    await cliente.query('ROLLBACK');
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo guardar tu verificación. Inténtalo de nuevo.' });
  } finally {
    cliente.release();
  }
});

/* ───────────── HU-12: administrador aprueba o rechaza ───────────── */

router.get('/admin/verificaciones', esAdmin, async (req, res) => {
  const estado = ['en_revision', 'aprobado', 'rechazado'].includes(req.query.estado) ? req.query.estado : 'en_revision';
  const r = await pool.query(
    `SELECT v.id, v.estado, v.creado_en, v.motivo_rechazo, v.revisado_en,
            u.id AS usuario_id, u.nombre, u.correo, u.ciudad,
            (SELECT json_agg(json_build_object('id', a.id, 'tipo', a.tipo) ORDER BY a.id)
               FROM archivos_cuidador a WHERE a.verificacion_id = v.id) AS archivos
     FROM verificaciones_cuidador v JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.estado = $1 ORDER BY v.creado_en`,
    [estado]
  );
  res.json(r.rows.map((v) => ({
    id: v.id, estado: v.estado, enviadaEn: v.creado_en, motivoRechazo: v.motivo_rechazo, revisadaEn: v.revisado_en,
    cuidador: { id: v.usuario_id, nombre: v.nombre, correo: v.correo, ciudad: v.ciudad },
    archivos: v.archivos ?? [],
  })));
});

// El administrador abre los documentos cifrados (se descifran al vuelo).
router.get('/admin/archivos/:id', esAdmin, async (req, res) => {
  const r = await pool.query(`SELECT mime, cifrado, datos FROM archivos_cuidador WHERE id = $1 AND tipo <> 'foto_espacio'`, [req.params.id]);
  const a = r.rows[0];
  if (!a) return res.status(404).json({ error: 'Archivo no encontrado' });
  try {
    res.set('Content-Type', a.mime).set('Cache-Control', 'no-store').send(a.cifrado ? descifrar(a.datos) : a.datos);
  } catch {
    res.status(500).json({ error: 'No se pudo abrir el archivo' });
  }
});

const cargarPendiente = async (id) => {
  const r = await pool.query(
    `SELECT v.id, v.estado, u.id AS usuario_id, u.nombre, u.correo
     FROM verificaciones_cuidador v JOIN usuarios u ON u.id = v.usuario_id WHERE v.id = $1`,
    [id]
  );
  return r.rows[0];
};

router.post('/admin/verificaciones/:id/aprobar', esAdmin, async (req, res) => {
  const v = await cargarPendiente(req.params.id);
  if (!v) return res.status(404).json({ error: 'Verificación no encontrada' });
  if (v.estado !== 'en_revision') return res.status(409).json({ error: 'Esta verificación ya fue revisada' });

  // HU-13: la aprobación vence a los 12 meses.
  await pool.query(
    `UPDATE verificaciones_cuidador
     SET estado = 'aprobado', revisado_por = $2, revisado_en = NOW(), vence_en = NOW() + INTERVAL '12 months'
     WHERE id = $1`,
    [v.id, req.usuario.id]
  );
  await notificar(v.correo, 'Tus antecedentes fueron aprobados',
    `Hola ${v.nombre}, aprobamos tus antecedentes. Tu perfil ya aparece en la búsqueda de Red de Cuidadores. La aprobación vale 12 meses.`);
  res.json({ ok: true });
});

router.post('/admin/verificaciones/:id/rechazar', esAdmin, async (req, res) => {
  const motivo = String(req.body.motivo ?? '').trim();
  if (motivo.length < 5) return res.status(400).json({ error: 'Escribe el motivo del rechazo' });
  const v = await cargarPendiente(req.params.id);
  if (!v) return res.status(404).json({ error: 'Verificación no encontrada' });
  if (v.estado !== 'en_revision') return res.status(409).json({ error: 'Esta verificación ya fue revisada' });

  await pool.query(
    `UPDATE verificaciones_cuidador
     SET estado = 'rechazado', motivo_rechazo = $2, revisado_por = $3, revisado_en = NOW()
     WHERE id = $1`,
    [v.id, motivo, req.usuario.id]
  );
  await notificar(v.correo, 'No pudimos aprobar tus antecedentes',
    `Hola ${v.nombre}, tu verificación fue rechazada. Motivo: ${motivo}. Puedes volver a enviar tus documentos desde la app.`);
  res.json({ ok: true });
});

/* ───────────── HU-14: suspender a un cuidador ───────────── */

router.get('/admin/cuidadores', esAdmin, async (req, res) => {
  const r = await pool.query(
    `SELECT u.id, u.nombre, u.correo, u.ciudad, u.status,
            (SELECT json_build_object('estado', v.estado, 'vence_en', v.vence_en)
               FROM verificaciones_cuidador v WHERE v.usuario_id = u.id ORDER BY v.id DESC LIMIT 1) AS verificacion
     FROM usuarios u WHERE u.rol = 'cuidador' ORDER BY u.nombre`
  );
  res.json(r.rows.map((u) => ({
    id: u.id, nombre: u.nombre, correo: u.correo, ciudad: u.ciudad, activo: u.status,
    verificacion: estadoVisible(u.verificacion ? { estado: u.verificacion.estado, vence_en: u.verificacion.vence_en } : null),
  })));
});

router.post('/admin/cuidadores/:id/suspender', esAdmin, async (req, res) => {
  const motivo = String(req.body.motivo ?? '').trim();
  if (motivo.length < 5) return res.status(400).json({ error: 'Escribe el motivo de la suspensión' });

  const r = await pool.query(`SELECT id, nombre, correo, status FROM usuarios WHERE id = $1 AND rol = 'cuidador'`, [req.params.id]);
  const c = r.rows[0];
  if (!c) return res.status(404).json({ error: 'Cuidador no encontrado' });
  if (!c.status) return res.status(409).json({ error: 'Este cuidador ya está suspendido' });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    // RN-5: no se borra nada, solo status = false.
    await cliente.query(`UPDATE usuarios SET status = FALSE, motivo_desactivacion = $2, desactivado_en = NOW(), actualizado_en = NOW() WHERE id = $1`, [c.id, motivo]);
    await cliente.query(`INSERT INTO suspensiones_cuidador (usuario_id, motivo, suspendido_por) VALUES ($1, $2, $3)`, [c.id, motivo, req.usuario.id]);
    // PENDIENTE (depende de Laura, módulo reservas): cancelar las reservas futuras de este
    // cuidador y avisar a los viajeros. Cuando exista la tabla de reservas se agrega aquí.
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    console.error(e.message);
    return res.status(500).json({ error: 'No se pudo suspender al cuidador' });
  } finally {
    cliente.release();
  }
  await notificar(c.correo, 'Tu cuenta fue suspendida', `Hola ${c.nombre}, suspendimos tu cuenta por el siguiente motivo: ${motivo}.`);
  res.json({ ok: true });
});

export default router;
