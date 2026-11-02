import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/uploads/mascotas
const DIR = path.join(__dirname, '../../../uploads/mascotas');
fs.mkdirSync(DIR, { recursive: true });

function crear(tiposPermitidos) {
  return multer({
    storage: multer.diskStorage({
      destination: DIR,
      filename: (req, file, cb) =>
        cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) =>
      tiposPermitidos.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Formato de archivo no permitido')),
  });
}

const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
const subirFoto = crear(IMAGENES);
const subirComprobante = crear([...IMAGENES, 'application/pdf']);

// Devuelve el error como JSON en vez de romper la petición
const envolver = (mw) => (req, res, next) =>
  mw(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next()));

export const foto = envolver(subirFoto.single('foto'));
export const comprobante = envolver(subirComprobante.single('comprobante'));
