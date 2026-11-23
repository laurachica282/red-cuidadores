import crypto from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Almacén de archivos subidos (fotos de perfil, de mascotas, comprobantes y reportes).
// - Con SUPABASE_URL y SUPABASE_SERVICE_KEY (desplegado): Supabase Storage, en un bucket privado.
//   Render borra su disco en cada despliegue, así que ahí los archivos no pueden vivir en disco.
// - Sin ellas (local): la carpeta backend/uploads, como siempre.
// Los archivos se sirven siempre a través de la API (mismas rutas en los dos modos).

const aqui = path.dirname(fileURLToPath(import.meta.url));
const BASE_LOCAL = path.join(aqui, '../../uploads');
const CARPETA = /^[a-z]+$/;
const NOMBRE = /^[\w-]{8,64}\.(jpg|png|webp|pdf)$/;

export const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
export const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

const supabase = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const clave = process.env.SUPABASE_SERVICE_KEY;
  return url && clave ? { url, clave, bucket: process.env.SUPABASE_BUCKET || 'archivos' } : null;
};
export const modoAlmacen = () => (supabase() ? 'supabase' : 'local');

function validar(carpeta, nombre) {
  if (!CARPETA.test(carpeta) || !NOMBRE.test(nombre)) throw new Error('Nombre de archivo no válido');
}

const cabeceras = (s, extra = {}) => ({ apikey: s.clave, Authorization: `Bearer ${s.clave}`, ...extra });

// Crea el bucket privado la primera vez (si ya existe, Supabase responde error y se ignora).
let bucketListo = null;
function asegurarBucket(s) {
  bucketListo ??= fetch(`${s.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: cabeceras(s, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: s.bucket, name: s.bucket, public: false }),
  }).catch(() => {});
  return bucketListo;
}

export async function guardar(carpeta, nombre, buffer) {
  validar(carpeta, nombre);
  const s = supabase();
  if (!s) {
    await mkdir(path.join(BASE_LOCAL, carpeta), { recursive: true });
    await writeFile(path.join(BASE_LOCAL, carpeta, nombre), buffer, { flag: 'wx' });
    return;
  }
  await asegurarBucket(s);
  const r = await fetch(`${s.url}/storage/v1/object/${s.bucket}/${carpeta}/${nombre}`, {
    method: 'POST',
    headers: cabeceras(s, { 'Content-Type': TIPOS[nombre.split('.').pop()], 'x-upsert': 'false' }),
    body: buffer,
  });
  if (!r.ok) throw new Error(`Supabase Storage respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// Devuelve { buffer, tipo } o null si no existe.
export async function leer(carpeta, nombre) {
  try {
    validar(carpeta, nombre);
  } catch {
    return null;
  }
  const tipo = TIPOS[nombre.split('.').pop()];
  const s = supabase();
  if (!s) {
    try {
      return { buffer: await readFile(path.join(BASE_LOCAL, carpeta, nombre)), tipo };
    } catch {
      return null;
    }
  }
  const r = await fetch(`${s.url}/storage/v1/object/${s.bucket}/${carpeta}/${nombre}`, { headers: cabeceras(s) });
  if (!r.ok) return null;
  return { buffer: Buffer.from(await r.arrayBuffer()), tipo };
}

export async function borrar(carpeta, nombre) {
  try {
    validar(carpeta, nombre);
  } catch {
    return;
  }
  const s = supabase();
  if (!s) {
    await unlink(path.join(BASE_LOCAL, carpeta, nombre)).catch(() => {});
    return;
  }
  await fetch(`${s.url}/storage/v1/object/${s.bucket}/${carpeta}/${nombre}`, { method: 'DELETE', headers: cabeceras(s) })
    .catch(() => {});
}

// Responde el archivo por Express con cabeceras seguras (nosniff, caché larga: los nombres son únicos).
export async function servir(res, carpeta, nombre) {
  const archivo = await leer(carpeta, nombre);
  if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.set({
    'Content-Type': archivo.tipo,
    'Cache-Control': 'public, max-age=604800, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  return res.send(archivo.buffer);
}

// Tipo real por el contenido (no por el nombre ni lo que declara el navegador): 'jpg' | 'png' | 'webp' | 'pdf' | null.
export function detectarExtension(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'pdf';
  return null;
}

// Middleware para después de multer (memoryStorage): guarda req.file en la carpeta y deja
// req.file.filename con el nombre final, como lo hacía el disco. `permitidas`: extensiones aceptadas.
export function guardarSubida(carpeta, permitidas, mensaje) {
  return async (req, res, next) => {
    if (!req.file) return next();
    const ext = detectarExtension(req.file.buffer);
    if (!ext || !permitidas.includes(ext)) return res.status(400).json({ error: mensaje });
    try {
      req.file.filename = `${crypto.randomUUID()}.${ext}`;
      await guardar(carpeta, req.file.filename, req.file.buffer);
      next();
    } catch (e) {
      console.error('[almacen]', e.message);
      res.status(502).json({ error: 'No se pudo guardar el archivo. Inténtalo de nuevo.' });
    }
  };
}
