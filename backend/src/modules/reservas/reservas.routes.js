import { Router } from 'express';
import { verificarToken } from '../auth/verificarToken.js';
import * as reservas from './reservas.service.js';

const router = Router();
router.use(verificarToken);

const soloRol = (rol, mensaje) => (req, res, next) =>
  req.usuario.rol === rol ? next() : res.status(403).json({ error: mensaje });
const comoViajero = soloRol('viajero', 'Solo los viajeros pueden pedir reservas');
const comoCuidador = soloRol('cuidador', 'Solo los cuidadores pueden responder reservas');

// Ejecuta la acción y traduce los errores de la reserva a respuestas claras.
const responder = (accion, estadoOk = 200) => async (req, res) => {
  try {
    res.status(estadoOk).json(await accion(req));
  } catch (e) {
    if (e instanceof reservas.ErrorReserva) return res.status(e.estado).json({ error: e.message });
    console.error(e.message);
    res.status(500).json({ error: 'No se pudo completar la operación' });
  }
};

// El id de la ruta debe ser numérico.
router.param('id', (req, res, next, id) =>
  /^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Reserva no encontrada' })
);

router.post('/', comoViajero, responder((req) => reservas.crear(req.usuario.id, req.body ?? {}), 201));
router.get('/mias', comoViajero, responder((req) => reservas.delViajero(req.usuario.id)));
router.get('/recibidas', comoCuidador, responder((req) => reservas.delCuidador(req.usuario.id)));
router.get('/:id', responder((req) => reservas.obtener(req.usuario.id, req.params.id)));
router.post('/:id/confirmar', comoCuidador, responder((req) => reservas.confirmar(req.usuario.id, req.params.id)));
router.post('/:id/rechazar', comoCuidador, responder((req) => reservas.rechazar(req.usuario.id, req.params.id, req.body?.motivo)));
router.post('/:id/cancelar', comoViajero, responder((req) => reservas.cancelar(req.usuario.id, req.params.id)));

export default router;