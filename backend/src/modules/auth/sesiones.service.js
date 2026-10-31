import geoip from 'geoip-lite';
import { pool } from '../../db.js';

// Debe coincidir con el expiresIn del token de sesión: pasado ese tiempo el JWT ya no sirve.
export const DIAS_SESION = 7;

const NAVEGADORES = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
];

// iPhone/iPad antes que macOS y Android antes que Linux: sus user-agents también los mencionan.
const SISTEMAS = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPod/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

const buscar = (lista, ua) => lista.find(([re]) => re.test(ua))?.[1] ?? null;

const paises = new Intl.DisplayNames(['es'], { type: 'region' });

// Nombre legible del dispositivo a partir del user-agent, p. ej. { nombre: 'Chrome · Windows', so: 'Windows', tipo: 'computador' }.
export function describirDispositivo(ua = '') {
  const navegador = buscar(NAVEGADORES, ua);
  const so = buscar(SISTEMAS, ua);

  let tipo = 'computador';
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) tipo = 'tablet';
  else if (/iPhone|iPod|Mobile/.test(ua)) tipo = 'telefono';

  const nombre = [navegador, so].filter(Boolean).join(' · ') || 'Navegador desconocido';
  return { nombre, so, tipo };
}

// "Ciudad, País" según la IP; null si es local, privada o no se encuentra.
export function ubicar(ip) {
  const geo = ip ? geoip.lookup(ip) : null;
  if (!geo?.city) return null;
  let pais = geo.country;
  try {
    pais = paises.of(geo.country) ?? geo.country;
  } catch {
    // código de país inválido: se deja el código tal cual
  }
  return pais ? `${geo.city}, ${pais}` : geo.city;
}

// Registra el inicio de sesión y devuelve su id (va en el JWT como sid).
export async function crearSesion(usuarioId, req) {
  const ua = (req.get('user-agent') ?? '').slice(0, 500);
  const ip = req.ip?.replace(/^::ffff:/, '') || null;

  const r = await pool.query(
    `INSERT INTO sesiones (usuario_id, dispositivo, user_agent, ip, ciudad)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [usuarioId, describirDispositivo(ua).nombre.slice(0, 80), ua || null, ip, ubicar(ip)]
  );
  return r.rows[0].id;
}

// Cierra las sesiones abiertas del usuario, salvo `excepto` si se indica. Devuelve cuántas cerró.
export async function cerrarSesiones(usuarioId, { excepto } = {}) {
  const r = await pool.query(
    `UPDATE sesiones SET cerrada_en = NOW()
      WHERE usuario_id = $1 AND cerrada_en IS NULL AND ($2::bigint IS NULL OR id <> $2)`,
    [usuarioId, excepto ?? null]
  );
  return r.rowCount;
}
