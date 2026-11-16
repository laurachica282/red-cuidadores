import 'dotenv/config';
import pg from 'pg';

// Dos formas de conectarse:
// - DATABASE_URL (Supabase, Render…): la cadena de conexión completa. Usa SSL, que esos servicios exigen.
// - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD: Postgres local (Docker o pgAdmin), sin SSL.
const url = process.env.DATABASE_URL;

export const pool = new pg.Pool(
  url
    ? { connectionString: url, ssl: { rejectUnauthorized: false } }
    : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
);
