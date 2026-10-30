import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorHttp } from './errores.js';
import { FOTO } from './config.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const NOMBRE_VALIDO = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

// Se mira el contenido del archivo, no el nombre ni el tipo que declara el navegador:
// un .jpg que en realidad es otra cosa se rechaza.
export function tipoDeImagen(buffer) {
  if (buffer.length > 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length > 12 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export function crearAlmacenFotos({ directorio = process.env.UPLOADS_DIR ?? path.join(aqui, '../../../uploads/fotos') } = {}) {
  return {
    directorio,

    async guardar(buffer) {
      const tipo = tipoDeImagen(buffer);
      if (!tipo) throw new ErrorHttp(400, 'La foto debe ser JPG, PNG o WEBP');
      const nombre = `${randomBytes(16).toString('hex')}.${FOTO.extensiones[tipo]}`;
      await mkdir(directorio, { recursive: true });
      await writeFile(path.join(directorio, nombre), buffer, { flag: 'wx' });
      return nombre;
    },

    async borrar(nombre) {
      if (!nombre || !NOMBRE_VALIDO.test(nombre)) return;
      await unlink(path.join(directorio, nombre)).catch(() => {});
    },
  };
}
