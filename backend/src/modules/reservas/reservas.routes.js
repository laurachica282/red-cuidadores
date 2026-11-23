import { Router } from 'express';
import { verificarToken } from '../auth/verificarToken.js';
import * as reservas from './reservas.service.js';
import * as cancelaciones from './cancelaciones.js';

const router = Router();
router.use(verificarToken);

const soloRol = (rol, mensaje) => (req, res, next) =>
  req.usuario.rol === rol ? next() : res.status(403).json({ error: mensaje });
const comoViajero = soloRol('viajero', 'Solo los viajeros pueden pedir reservas');
const comoCuidador = soloRol('cuidador', 'Solo los cuidadores pueden responder reservas');
const comoAdmin = soloRol('admin', 'Solo un administrador puede hacer esto');

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

// Administración: cancelaciones hechas por cuidadores (antes de '/:id' para que no se confundan).
router.get('/admin/cancelaciones', comoAdmin,
  responder((req) => cancelaciones.listarCancelaciones(String(req.query.estado ?? 'en_revision'))));
const idCancelacion = (req, res, next) =>
  /^\d+$/.test(req.params.cancelacionId) ? next() : res.status(404).json({ error: 'Cancelación no encontrada' });
router.post('/admin/cancelaciones/:cancelacionId/revisar', comoAdmin, idCancelacion,
  responder((req) => cancelaciones.revisarCancelacion(req.usuario.id, req.params.cancelacionId, req.body ?? {})));

router.post('/', comoViajero, responder((req) => reservas.crear(req.usuario.id, req.body ?? {}), 201));
router.get('/mias', comoViajero, responder((req) => reservas.delViajero(req.usuario.id)));
router.get('/recibidas', comoCuidador, responder((req) => reservas.delCuidador(req.usuario.id)));
router.get('/:id', responder((req) => reservas.obtener(req.usuario.id, req.params.id)));
router.post('/:id/confirmar', comoCuidador, responder((req) => reservas.confirmar(req.usuario.id, req.params.id)));
router.post('/:id/rechazar', comoCuidador, responder((req) => reservas.rechazar(req.usuario.id, req.params.id, req.body?.motivo)));
router.get('/:id/cancelacion', comoViajero, responder((req) => reservas.cotizarCancelar(req.usuario.id, req.params.id)));
router.post('/:id/cancelar', comoViajero, responder((req) => reservas.cancelar(req.usuario.id, req.params.id)));
// El cuidador cancela una reserva que ya aceptó: reembolso del 100 % al viajero y revisión del administrador.
router.post('/:id/cancelar-cuidador', comoCuidador,
  responder((req) => cancelaciones.cancelarComoCuidador(req.usuario.id, req.params.id, req.body ?? {})));

export default router;