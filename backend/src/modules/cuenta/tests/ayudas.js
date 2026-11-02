import './entorno.js';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import express from 'express';
import pg from 'pg';
import request from 'supertest';
import authRoutes from '../../auth/auth.routes.js';
import { ErrorHttp } from '../errores.js';
import { crearModuloCuenta } from '../modulo.js';
import { crearAlmacenFotos } from '../fotos.js';

export const CLAVE = 'Luna2026ok';

const dirDb = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../db');

// Las pruebas hacen TRUNCATE ... CASCADE: entorno.js ya exige que la base acabe en _test.
export function crearPoolDePruebas() {
  return new pg.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
  });
}

// Aplica TODAS las migraciones de backend/src/db en orden (las del módulo auth y la de cuenta).
export async function aplicarEsquema(pool) {
  const archivos = (await readdir(dirDb)).filter((f) => f.endsWith('.sql')).sort();
  for (const f of archivos) await pool.query(await readFile(path.join(dirDb, f), 'utf8'));
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

// La app de pruebas monta el login REAL del módulo auth y el módulo cuenta. Así los tokens salen del
// mismo flujo que usa la aplicación y las pruebas siguen valiendo cuando auth cambie sus sesiones (HU-08).
let appActual;

export async function montarApp(pool, extra = {}) {
  const correo = crearCorreoFalso();
  const directorio = await mkdtemp(path.join(os.tmpdir(), 'fotos-test-'));
  const modulo = crearModuloCuenta({
    pool, correo, fotos: crearAlmacenFotos({ directorio }), limites: false, log: { error() {}, info() {}, warn() {} },
    ...extra,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/cuenta', modulo.router);
  appActual = app;
  return { app, correo, directorio, ...modulo };
}

let contador = 0;

// Crea un usuario con el correo ya verificado y le saca el token iniciando sesión de verdad.
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
    `INSERT INTO usuarios (nombre, correo, clave_hash, rol, correo_verificado) VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
    [u.nombre, u.correo, await bcrypt.hash(u.clave, 4), u.rol],
  );
  const login = await request(appActual).post('/api/auth/login').send({ correo: u.correo, clave: u.clave });
  if (login.status !== 200) throw new Error(`No se pudo iniciar sesión en la prueba (${login.status}): ${login.body.error}`);
  return { ...fila, clave: u.clave, token: login.body.token };
}

export const conToken = (peticion, usuario) => peticion.set('Authorization', `Bearer ${usuario.token}`);

// Salta la espera de 60 s entre códigos sin tener que dormir la prueba.
export const envejecerCodigos = (pool, usuarioId) =>
  pool.query("UPDATE cuenta_codigos SET creado_en = NOW() - INTERVAL '2 minutes' WHERE usuario_id = $1", [usuarioId]);

export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
export const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
