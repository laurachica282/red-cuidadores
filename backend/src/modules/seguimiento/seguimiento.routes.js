import { Router } from 'express';
import { verificarToken } from '../auth/verificarToken.js';
import * as seguimiento from './seguimiento.service.js';
import { fotoReporte, rutaFoto } from './subida.js';

const router = Router();
router.use(verificarToken);

// Ejecuta la acción y traduce los errores del seguimiento a respuestas claras.
const responder = (accion, estadoOk = 200) => async (req, res) => {
  try {
    res.status(estadoOk).json(await accion(req));
  } catch (e) {
    if (e instanceof seguimiento.ErrorSeguimiento) return res.status(e.estado).json({ error: e.message });
    console.error('[seguimiento]', e);
    res.status(500).json({ error: 'No se pudo completar la operación' });
  }
};

router.param('id', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Reserva no encontrada' })));
router.param('mascotaId', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Mascota no encontrada' })));

// Historial: todas las reservas de la persona con su resumen (reportes, mensajes, alertas).
router.get('/reservas', responder((req) => seguimiento.historial(req.usuario.id)));
router.get('/reservas/:id', responder((req) => seguimiento.detalle(req.usuario.id, req.params.id)));

// HU-30
router.post('/reservas/:id/reportes', fotoReporte,
  responder((req) => seguimiento.crearReporte(req.usuario.id, req.params.id, req.body ?? {}, rutaFoto(req.file)), 201));

// HU-31
router.get('/reservas/:id/mensajes', responder((req) => seguimiento.mensajes(req.usuario.id, req.params.id, req.query.despues)));
router.post('/reservas/:id/mensajes', responder((req) => seguimiento.enviarMensaje(req.usuario.id, req.params.id, req.body?.texto), 201));

// HU-28
router.post('/reservas/:id/emergencia', responder((req) => seguimiento.alertar(req.usuario.id, req.params.id, req.body?.mensaje), 201));
router.get('/contacto-emergencia', responder((req) => seguimiento.leerContacto(req.usuario.id)));
router.put('/contacto-emergencia', responder((req) => seguimiento.guardarContacto(req.usuario.id, req.body ?? {})));
router.get('/mascotas/veterinarios', responder((req) => seguimiento.veterinarios(req.usuario.id)));
router.put('/mascotas/:mascotaId/veterinario',
  responder((req) => seguimiento.guardarVeterinario(req.usuario.id, req.params.mascotaId, req.body ?? {})));

// Campana de notificaciones
router.get('/notificaciones', responder((req) => seguimiento.notificaciones(req.usuario.id)));
router.post('/notificaciones/vistas', responder((req) => seguimiento.marcarVistas(req.usuario.id)));
router.post('/notificaciones/leidas', responder((req) => seguimiento.marcarLeidas(req.usuario.id)));
router.post('/notificaciones/:avisoId/leida', responder((req) => seguimiento.marcarLeida(req.usuario.id, req.params.avisoId)));

export default router;
