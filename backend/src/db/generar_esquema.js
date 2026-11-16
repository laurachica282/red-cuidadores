// Une todos los scripts numerados (01_..., 02_..., en orden) en un solo archivo: esquema_completo.sql.
// Sirve para crear la estructura de una base nueva de una sola vez, por ejemplo pegándolo en el
// editor SQL de Supabase. No incluye datos de prueba (para eso: npm run db:poblar).
//   npm run db:esquema
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const carpeta = dirname(fileURLToPath(import.meta.url));
const scripts = readdirSync(carpeta).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();

const partes = scripts.map((f) => {
  const sql = readFileSync(join(carpeta, f), 'utf8').trim();
  return `-- ═════════════════════════════ ${f} ═════════════════════════════\n${sql}\n`;
});

const cabecera = `-- Red de Cuidadores · estructura completa de la base de datos.
-- GENERADO por src/db/generar_esquema.js a partir de: ${scripts.join(', ')}.
-- No lo edites a mano: cambia el script numerado y vuelve a correr "npm run db:esquema".
-- Ejecútalo una sola vez sobre una base vacía (en Supabase: SQL Editor → pegar → Run).

`;

writeFileSync(join(carpeta, 'esquema_completo.sql'), cabecera + partes.join('\n'));
console.log(`esquema_completo.sql generado con ${scripts.length} scripts.`);
