import multer from 'multer';
import { guardarSubida } from '../../shared/almacen.js';

// Las fotos se guardan con el almacén compartido (disco en local, Supabase Storage desplegado)
// en la carpeta "reportes" y se sirven en /uploads/reportes/<nombre>.
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

const subir = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    TIPOS.includes(file.mimetype) ? cb(null, true) : cb(new Error('La foto debe ser JPG, PNG o WEBP')),
}).single('foto');

export const rutaFoto = (file) => (file ? `/uploads/reportes/${file.filename}` : null);

// HU-30: recibe la foto opcional del reporte y devuelve los errores como JSON.
const guardarFoto = guardarSubida('reportes', ['jpg', 'png', 'webp'], 'La foto debe ser JPG, PNG o WEBP');

export const fotoReporte = (req, res, next) =>
  subir(req, res, (err) => {
    if (!err) return guardarFoto(req, res, next);
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `La foto debe pesar máximo ${MAX_MB} MB` : err.message;
    res.status(400).json({ error: msg });
  });
