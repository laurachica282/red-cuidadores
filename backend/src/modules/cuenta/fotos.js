import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TIPOS, borrar, guardar, servir } from '../../shared/almacen.js';
import { ErrorHttp } from './errores.js';
import { FOTO } from './config.js';

export const NOMBRE_VALIDO = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

// Se mira el contenido del archivo, no el nombre ni el tipo que declara el navegador:
// un .jpg que en realidad es otra cosa se rechaza.
export function tipoDeImagen(buffer) {
  if (buffer.length > 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length > 12 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Almacén en una carpeta fija (lo usan las pruebas, con una carpeta temporal).
function almacenEnCarpeta(directorio) {
  return {
    guardar: async (_carpeta, nombre, buffer) => {
      await mkdir(directorio, { recursive: true });
      await writeFile(path.join(directorio, nombre), buffer, { flag: 'wx' });
    },
    borrar: (_carpeta, nombre) => unlink(path.join(directorio, nombre)).catch(() => {}),
    servir: async (res, _carpeta, nombre) => {
      try {
        const buffer = await readFile(path.join(directorio, nombre));
        res.set({ 'Content-Type': TIPOS[nombre.split('.').pop()], 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' });
        return res.send(buffer);
      } catch {
        return res.status(404).json({ error: 'Foto no encontrada' });
      }
    },
  };
}

// Las fotos van al almacén compartido: disco en local, Supabase Storage desplegado (shared/almacen.js).
// Con `directorio` se guardan en esa carpeta (pruebas).
export function crearAlmacenFotos({ directorio, almacen = directorio ? almacenEnCarpeta(directorio) : { guardar, borrar, servir } } = {}) {
  return {
    async guardar(buffer) {
      const tipo = tipoDeImagen(buffer);
      if (!tipo) throw new ErrorHttp(400, 'La foto debe ser JPG, PNG o WEBP');
      const nombre = `${randomBytes(16).toString('hex')}.${FOTO.extensiones[tipo]}`;
      await almacen.guardar('fotos', nombre, buffer);
      return nombre;
    },

    async borrar(nombre) {
      if (!nombre || !NOMBRE_VALIDO.test(nombre)) return;
      await almacen.borrar('fotos', nombre);
    },

    servir: (res, nombre) => almacen.servir(res, 'fotos', nombre),
  };
}
