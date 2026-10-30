import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { ErrorHttp } from '../errores.js';
import { crearModuloCuenta } from '../modulo.js';
import { crearAlmacenFotos } from '../fotos.js';

process.env.JWT_SECRET ??= 'secreto-solo-para-pruebas';
export const CLAVE = 'Luna2026ok';

const aqui = path.dirname(fileURLToPath(import.meta.url));

// Las pruebas hacen TRUNCATE ... CASCADE: solo corren contra una base cuyo nombre acabe en _test.
export function crearPoolDePruebas() {
  const database = process.env.TEST_DB_NAME ?? 'red_cuidadores_test';
  if (!database.endsWith('_test')) {
    throw new Error(`TEST_DB_NAME debe terminar en _test (recibido: ${database})`);
  }
  return new pg.Pool({
    host: process.env.TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT ?? 5432),
    database,
    user: process.env.TEST_DB_USER ?? 'postgres',
    password: process.env.TEST_DB_PASSWORD || undefined,
  });
}

export async function aplicarEsquema(pool) {
  for (const f of ['01_usuarios.sql', '02_cuenta.sql']) {
    await pool.query(await readFile(path.join(aqui, '../../../db', f), 'utf8'));
  }
}

export const limpiar = (pool) => pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');

// Correo falso: guarda lo "enviado" para poder leer los códigos.
export function crearCorreoFalso() {
  const enviados = [];
  return {
    enviados,
    falla: false,
    async enviar(m) {
      if (this.falla) throw new ErrorHttp(502, 'No pudimos enviar el correo. Inténtalo más tarde.');
      enviados.push(m);
    },
    para: (correo) => enviados.filter((m) => m.para === correo),
    codigoPara(correo) {
      const m = this.para(correo).findLast((x) => /\d{6}/.test(x.texto));
      return m?.texto.match(/\b(\d{6})\b/)[1];
    },
  };
}

export async function montarApp(pool, extra = {}) {
  const correo = crearCorreoFalso();
  const directorio = await mkdtemp(path.join(os.tmpdir(), 'fotos-test-'));
  const modulo = crearModuloCuenta({
    pool, correo, fotos: crearAlmacenFotos({ directorio }), limites: false, log: { error() {}, info() {}, warn() {} },
    ...extra,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/cuenta', modulo.router);
  return { app, correo, directorio, ...modulo };
}

let contador = 0;
export async function crearUsuario(pool, datos = {}) {
  contador += 1;
  const u = {
    nombre: `Persona ${contador}`,
    correo: `persona${contador}@correo.com`,
    rol: 'viajero',
    clave: CLAVE,
    ...datos,
  };
  const { rows: [fila] } = await pool.query(
    `INSERT INTO usuarios (nombre, correo, clave_hash, rol) VALUES ($1, $2, $3, $4) RETURNING *`,
    [u.nombre, u.correo, await bcrypt.hash(u.clave, 4), u.rol],
  );
  return { ...fila, clave: u.clave, token: jwt.sign({ id: fila.id, rol: fila.rol }, process.env.JWT_SECRET, { expiresIn: '1h' }) };
}

export const conToken = (peticion, usuario) => peticion.set('Authorization', `Bearer ${usuario.token}`);

// Salta la espera de 60 s entre códigos sin tener que dormir la prueba.
export const envejecerCodigos = (pool, usuarioId) =>
  pool.query("UPDATE cuenta_codigos SET creado_en = NOW() - INTERVAL '2 minutes' WHERE usuario_id = $1", [usuarioId]);

export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
export const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
