import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/auth', authRoutes);

// Ruta de prueba: confirma que el servidor y la base responden.
app.get('/api/salud', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW()');
    res.json({ ok: true, hora: r.rows[0].now });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ ok: false, error: 'No se pudo conectar a la base' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`API lista en http://localhost:${process.env.PORT}`);
});