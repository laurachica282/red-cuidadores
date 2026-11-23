// Fotos para los datos de demostración (npm run db:fotos), después de npm run db:poblar:
//   - 3 fotos del espacio por cuidador (Unsplash) → archivos_cuidador (en la base de datos).
//   - Foto de perfil por cuenta de demo (randomuser.me, fotos hechas para pruebas) → almacén "fotos".
//   - Foto por perro y gato (dog.ceo y TheCatAPI) → almacén "mascotas".
// El almacén es disco en local o Supabase Storage si hay SUPABASE_URL y SUPABASE_SERVICE_KEY (shared/almacen.js).
// Con una base remota (DATABASE_URL) y sin Supabase Storage, solo se cargan las fotos del espacio:
// las demás quedarían en este computador y el servidor desplegado no las vería.
// Solo toca cuentas @demo.redcuidadores.co que todavía no tienen foto; se puede correr más de una vez.
import 'dotenv/config';
import crypto from 'node:crypto';
import { pool } from '../db.js';
import { detectarExtension, guardar, modoAlmacen } from '../shared/almacen.js';

const DOMINIO = 'demo.redcuidadores.co';
const CASAS = ['1568605114967-8130f3a36994', '1600596542815-ffad4c1539a9', '1600585154340-be6161a56a0c',
  '1502672260266-1c1ef2d93688', '1586023492125-27b2c045efd7', '1560448204-e02f11c3d0e2', '1583847268964-b28dc8f51f92',
  '1522708323590-d24dbb6b0267', '1548199973-03cce0bbc87b', '1587300003388-59208cc962cb'];
const NOMBRES_F = new Set(['Valentina', 'Camila', 'Sofía', 'Isabella', 'Mariana', 'Daniela', 'Laura', 'Gabriela', 'Natalia',
  'Paula', 'Andrea', 'Carolina', 'Juliana', 'Manuela', 'Sara', 'Lucía', 'Ana', 'María', 'Catalina', 'Alejandra']);
const MAX_BYTES = 2 * 1024 * 1024;

async function bajar(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    const ext = detectarExtension(b);
    return ext && ext !== 'pdf' && b.length <= MAX_BYTES ? { buffer: b, ext } : null;
  } catch {
    return null;
  }
}
const json = async (url) => (await fetch(url, { signal: AbortSignal.timeout(30000) })).json();
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Descarga varias a la vez (de a 6) y descarta las que fallen.
async function bajarTodas(urls) {
  const salida = [];
  for (let i = 0; i < urls.length; i += 6) {
    salida.push(...(await Promise.all(urls.slice(i, i + 6).map(bajar))).filter(Boolean));
  }
  return salida;
}

async function main() {
  const remota = Boolean(process.env.DATABASE_URL);
  const conAlmacen = !remota || modoAlmacen() === 'supabase';
  console.log(`Base: ${remota ? 'remota' : 'local'} · almacén de archivos: ${modoAlmacen()}`);

  /* Fotos del espacio de los cuidadores (en la base de datos) */
  const cuidadores = (await pool.query(
    `SELECT u.id FROM usuarios u WHERE u.rol = 'cuidador' AND u.correo LIKE $1
       AND NOT EXISTS (SELECT 1 FROM archivos_cuidador a WHERE a.usuario_id = u.id AND a.tipo = 'foto_espacio' AND a.activo)
     ORDER BY u.id`, [`%@${DOMINIO}`])).rows;
  if (cuidadores.length) {
    const casas = await bajarTodas(CASAS.map((id) => `https://images.unsplash.com/photo-${id}?w=1000&q=70&fm=jpg&fit=crop&h=700`));
    console.log(`  ${casas.length} fotos de casas descargadas`);
    for (const [i, c] of cuidadores.entries()) {
      for (let k = 0; k < 3; k++) {
        const f = casas[(i * 3 + k) % casas.length];
        await pool.query(`INSERT INTO archivos_cuidador (usuario_id, tipo, mime, datos) VALUES ($1, 'foto_espacio', $2, $3)`,
          [c.id, MIME[f.ext], f.buffer]);
      }
    }
  }
  console.log(`✓ Fotos del espacio: ${cuidadores.length} cuidadores`);

  if (!conAlmacen) {
    console.log('\n⚠ Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY en el .env: no se cargan fotos de perfil ni de mascotas.');
    console.log('  Agrégalas y vuelve a correr npm run db:fotos (lo que ya está no se repite).');
    return;
  }

  /* Fotos de perfil (randomuser.me: 100 hombres y 100 mujeres) */
  const personas = (await pool.query(
    `SELECT id, nombre FROM usuarios WHERE correo LIKE $1 AND rol <> 'admin' AND foto_url IS NULL ORDER BY id`,
    [`%@${DOMINIO}`])).rows;
  const cache = new Map();
  const cuenta = { men: 0, women: 0 };
  let perfiles = 0;
  for (const p of personas) {
    const genero = NOMBRES_F.has(p.nombre.split(' ')[0]) ? 'women' : 'men';
    const url = `https://randomuser.me/api/portraits/${genero}/${cuenta[genero]++ % 100}.jpg`;
    if (!cache.has(url)) cache.set(url, await bajar(url));
    const f = cache.get(url);
    if (!f) continue;
    const nombre = `${crypto.randomBytes(16).toString('hex')}.${f.ext}`;
    await guardar('fotos', nombre, f.buffer);
    await pool.query('UPDATE usuarios SET foto_url = $1 WHERE id = $2', [nombre, p.id]);
    perfiles++;
  }
  console.log(`✓ Fotos de perfil: ${perfiles} de ${personas.length}`);

  /* Fotos de perros y gatos */
  const mascotas = (await pool.query(
    `SELECT m.id, m.especie FROM mascotas m JOIN usuarios u ON u.id = m.usuario_id
      WHERE u.correo LIKE $1 AND m.foto_url IS NULL AND m.especie IN ('perro', 'gato') ORDER BY m.id`,
    [`%@${DOMINIO}`])).rows;
  if (mascotas.length) {
    const perros = await bajarTodas((await json('https://dog.ceo/api/breeds/image/random/40')).message ?? []);
    const urlsGatos = [];
    for (let i = 0; i < 4; i++) urlsGatos.push(...(await json('https://api.thecatapi.com/v1/images/search?limit=10')).map((g) => g.url));
    const gatos = await bajarTodas([...new Set(urlsGatos)]);
    console.log(`  ${perros.length} fotos de perros y ${gatos.length} de gatos descargadas`);
    const n = { perro: 0, gato: 0 };
    let hechas = 0;
    for (const m of mascotas) {
      const pool_ = m.especie === 'perro' ? perros : gatos;
      if (!pool_.length) continue;
      const f = pool_[n[m.especie]++ % pool_.length];
      const nombre = `${crypto.randomUUID()}.${f.ext}`;
      await guardar('mascotas', nombre, f.buffer);
      await pool.query('UPDATE mascotas SET foto_url = $1 WHERE id = $2', [`/uploads/mascotas/${nombre}`, m.id]);
      hechas++;
    }
    console.log(`✓ Fotos de mascotas: ${hechas} de ${mascotas.length} perros y gatos`);
  }
}

main()
  .catch((e) => {
    console.error('No se pudieron cargar las fotos:', e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
