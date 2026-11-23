import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { modoAlmacen, servir } from './shared/almacen.js';
import authRoutes from './modules/auth/auth.routes.js';
import cuentaRoutes from './modules/cuenta/index.js';
import cuidadoresRoutes from './modules/cuidadores/cuidadores.routes.js';
import regionRoutes from './modules/region/region.routes.js';
import mascotasRoutes from './modules/mascotas/index.js';
import busquedaRoutes from './modules/busqueda/index.js';
import pagosRoutes from './modules/pagos/index.js';
import reservasRoutes from './modules/reservas/index.js';
import seguimientoRoutes from './modules/seguimiento/index.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean) }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/cuenta', cuentaRoutes);
app.use('/api/cuidadores', cuidadoresRoutes);
app.use('/api/region', regionRoutes);
// Archivos subidos (mascotas y reportes): salen del almacén compartido, sea disco o Supabase Storage.
app.get('/uploads/:carpeta/:archivo', (req, res) => {
  if (!['mascotas', 'reportes'].includes(req.params.carpeta)) return res.status(404).json({ error: 'Archivo no encontrado' });
  servir(res, req.params.carpeta, req.params.archivo).catch(() => res.status(404).json({ error: 'Archivo no encontrado' }));
});
app.use('/api/mascotas', mascotasRoutes);
app.use('/api/busqueda', busquedaRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/seguimiento', seguimientoRoutes);

// Raíz: al abrir la URL del backend en el navegador se ve que está corriendo (sin tocar la base).
app.get('/', (req, res) => {
  res.json({ servicio: 'Red de Cuidadores API', estado: 'Backend is running', salud: '/api/salud' });
});

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
  console.log(`API lista en http://localhost:${process.env.PORT} · archivos: ${modoAlmacen()}`);
});

