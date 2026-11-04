import { Router } from 'express';
import { verificarToken } from '../auth/verificarToken.js';
import * as pasarelas from './pasarelas.service.js';
import { paisDeCoordenadas } from './deteccion.js';

const router = Router();
router.use(verificarToken);

const soloAdmin = (req, res, next) =>
  req.usuario.rol === 'admin'
    ? next()
    : res.status(403).json({ error: 'Solo un administrador puede hacer esto' });

// Valida los datos de una pasarela y devuelve la lista de errores.
function validar(d) {
  const errores = [];
  if (!d.nombre_pais?.trim()) errores.push('Falta el nombre del país');
  if (!d.pasarela?.trim()) errores.push('Falta la pasarela');
  if (!/^[A-Z]{3}$/.test(d.moneda ?? '')) errores.push('La moneda debe ser un código de 3 letras, como COP');
  const c = Number(d.comision_pct);
  if (!Number.isFinite(c) || c < 0 || c > 100) errores.push('La comisión debe estar entre 0 y 100');
  if (typeof d.activa !== 'boolean') errores.push('"activa" debe ser verdadero o falso');
  return errores;
}

// Lista de pasarelas (administración).
router.get('/pasarelas', soloAdmin, async (req, res) => {
  res.json(await pasarelas.listar());
});

// Configuración de un país. El viajero solo ve países activos.
router.get('/pasarelas/:pais', async (req, res) => {
  const p = await pasarelas.obtener(String(req.params.pais).toUpperCase());
  if (!p || (!p.activa && req.usuario.rol !== 'admin')) {
    return res.status(404).json({ error: 'No hay pagos disponibles en ese país' });
  }
  res.json(p);
});

// Crea o actualiza la configuración de un país (HU-20).
router.put('/pasarelas/:pais', soloAdmin, async (req, res) => {
  const pais = String(req.params.pais).toUpperCase();
  if (!/^[A-Z]{2}$/.test(pais)) return res.status(400).json({ error: 'El país debe ser un código de 2 letras, como CO' });
  const errores = validar(req.body);
  if (errores.length) return res.status(400).json({ error: errores[0], errores });
  const datos = { ...req.body, comision_pct: Number(req.body.comision_pct) };
  res.json(await pasarelas.guardar(pais, datos));
});

// HU-19: país según las coordenadas del navegador, y si hay pasarela activa ahí.
router.get('/pais-detectado', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Coordenadas no válidas' });
  }
  try {
    const geo = await paisDeCoordenadas(lat, lng);
    if (!geo) return res.status(404).json({ error: 'No pudimos saber en qué país estás' });
    const config = await pasarelas.obtener(geo.pais);
    const soportado = Boolean(config?.activa);
    res.json({ pais: geo.pais, nombre: geo.nombre, soportado, pasarela: soportado ? config : null });
  } catch (e) {
    console.error(e.message);
    res.status(502).json({ error: 'No pudimos detectar tu ubicación ahora. Inténtalo de nuevo.' });
  }
});

export default router;