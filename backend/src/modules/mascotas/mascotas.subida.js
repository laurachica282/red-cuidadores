import multer from 'multer';
import { guardarSubida } from '../../shared/almacen.js';

// Los archivos se guardan con el almacén compartido (disco en local, Supabase Storage desplegado)
// en la carpeta "mascotas" y se sirven en /uploads/mascotas/<nombre>.
function crear(tiposPermitidos) {
  return multer({
    storage: multer.memoryStorage(),
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

// Devuelve el error como JSON en vez de romper la petición; luego guarda el archivo en el almacén.
const envolver = (mw, guardar) => (req, res, next) =>
  mw(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : guardar(req, res, next)));

export const foto = envolver(subirFoto.single('foto'),
  guardarSubida('mascotas', ['jpg', 'png', 'webp'], 'La foto debe ser JPG, PNG o WEBP'));
export const comprobante = envolver(subirComprobante.single('comprobante'),
  guardarSubida('mascotas', ['jpg', 'png', 'webp', 'pdf'], 'El comprobante debe ser una imagen o un PDF'));
