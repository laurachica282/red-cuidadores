import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/uploads/reportes (lo sirve server.js en /uploads)
const DIR = path.join(__dirname, '../../../uploads/reportes');
fs.mkdirSync(DIR, { recursive: true });

const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_MB = 5;

const subir = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXTENSIONES[file.mimetype]),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXTENSIONES[file.mimetype] ? cb(null, true) : cb(new Error('La foto debe ser JPG, PNG o WEBP')),
}).single('foto');

export const rutaFoto = (file) => (file ? `/uploads/reportes/${file.filename}` : null);

// HU-30: recibe la foto opcional del reporte y devuelve los errores como JSON.
export const fotoReporte = (req, res, next) =>
  subir(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `La foto debe pesar máximo ${MAX_MB} MB` : err.message;
    res.status(400).json({ error: msg });
  });
