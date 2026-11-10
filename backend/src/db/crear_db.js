// Crea la base de datos, ejecuta los scripts numerados en orden y carga los datos de prueba.
//   npm run db:crear            crea la base (falla si ya existe)
//   npm run db:crear -- --reset BORRA la base y la vuelve a crear desde cero
//   npm run db:crear -- --sin-datos   no carga datos_prueba.sql
// Lee la conexión del .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const carpeta = dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');
const sinDatos = process.argv.includes('--sin-datos');
const nombre = process.env.DB_NAME || 'red_cuidadores';

if (!/^[a-z_][a-z0-9_]*$/.test(nombre)) {
  console.error(`DB_NAME no es válido: "${nombre}"`);
  process.exit(1);
}

const conexion = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

async function crearBase() {
  const admin = new pg.Client({ ...conexion, database: 'postgres' });
  await admin.connect();
  try {
    const existe = (await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre])).rowCount > 0;
    if (existe && !reset) {
      throw new Error(`La base "${nombre}" ya existe. Usa "npm run db:crear -- --reset" para borrarla y crearla de nuevo.`);
    }
    if (existe) {
      console.log(`Borrando la base "${nombre}"...`);
      await admin.query(`DROP DATABASE ${nombre} WITH (FORCE)`);
    }
    await admin.query(`CREATE DATABASE ${nombre} ENCODING 'UTF8' TEMPLATE template0`);
    console.log(`Base "${nombre}" creada.`);
  } finally {
    await admin.end();
  }
}

async function ejecutarScripts() {
  const scripts = readdirSync(carpeta).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  if (!sinDatos) scripts.push('datos_prueba.sql');

  const db = new pg.Client({ ...conexion, database: nombre });
  await db.connect();
  try {
    for (const archivo of scripts) {
      process.stdout.write(`  ${archivo} ... `);
      await db.query(readFileSync(join(carpeta, archivo), 'utf8'));
      console.log('ok');
    }
  } finally {
    await db.end();
  }
}

try {
  await crearBase();
  await ejecutarScripts();
  console.log('\nListo.' + (sinDatos ? '' : ' Cuentas de prueba con la contraseña "Prueba2026" (ej. ana@demo.com, laura@demo.com, admin@demo.com).'));
} catch (e) {
  console.error('\nError:', e.message);
  if (e.code === '28P01') console.error('La contraseña de PostgreSQL no coincide con DB_PASSWORD del .env.');
  if (e.code === 'ECONNREFUSED') console.error('PostgreSQL no está encendido o usa otro puerto.');
  process.exit(1);
}
