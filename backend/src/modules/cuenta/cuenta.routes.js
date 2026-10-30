import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { ErrorHttp, manejarErrores } from './errores.js';
import { esquemas, validar } from './validacion.js';
import { FOTO } from './config.js';
import { NOMBRE_VALIDO } from './fotos.js';
import { MONEDAS, PAISES } from './regiones.js';

const HORA = 60 * 60 * 1000;
const QUINCE_MIN = 15 * 60 * 1000;

// Límites de intentos por usuario (o por IP en lo público). `limites: false` los apaga en las pruebas.
const LIMITES = {
  clave: { windowMs: HORA, limit: 10 },          // endpoints que comprueban la contraseña
  codigo: { windowMs: QUINCE_MIN, limit: 20 },   // confirmaciones con código
  publicoSolicitar: { windowMs: QUINCE_MIN, limit: 10 },
  publicoConfirmar: { windowMs: QUINCE_MIN, limit: 20 },
};

export function crearRouter({ servicios, autenticacion, fotos, limites = LIMITES }) {
  const router = Router();
  const { requerirSesion, requerirRol } = autenticacion;

  const limitar = (config, porUsuario = false) => {
    if (limites === false) return (req, res, next) => next();
    return rateLimit({
      ...config,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      ...(porUsuario && { keyGenerator: (req) => `usuario:${req.usuario.id}` }),
      handler: (req, res, next) => next(new ErrorHttp(429, 'Demasiados intentos. Espera un momento e inténtalo de nuevo')),
    });
  };

  const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: FOTO.maxBytes, files: 1 } }).single('foto');

  // ---------- Públicas ----------

  // HU-35 / RN-6: países y monedas disponibles.
  router.get('/regiones', (req, res) => res.json({ paises: PAISES, monedas: MONEDAS }));

  // HU-09: las fotos de perfil son públicas (las ve cualquier viajero), con nombre imposible de adivinar.
  router.get('/fotos/:archivo', (req, res, next) => {
    if (!NOMBRE_VALIDO.test(req.params.archivo)) return next(new ErrorHttp(404, 'Foto no encontrada'));
    res.sendFile(req.params.archivo, {
      root: fotos.directorio,
      maxAge: '7d',
      immutable: true,
      headers: { 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' },
    }, (err) => { if (err) next(new ErrorHttp(404, 'Foto no encontrada')); });
  });

  // HU-40: el usuario desactivado no puede iniciar sesión, así que estas dos van sin token.
  router.post('/reactivacion/solicitar', limitar(LIMITES.publicoSolicitar), validar(esquemas.solicitarReactivacion),
    async (req, res) => res.json(await servicios.cierre.solicitarReactivacion(req.datos)));
  router.post('/reactivacion/confirmar', limitar(LIMITES.publicoConfirmar), validar(esquemas.confirmarReactivacion),
    async (req, res) => res.json(await servicios.cierre.confirmarReactivacion(req.datos)));

  // ---------- Con sesión ----------
  router.use(requerirSesion);

  // HU-09
  router.get('/perfil', async (req, res) => res.json(await servicios.perfil.perfil(req.usuario.id)));

  router.patch('/perfil', (req, res, next) => {
    if (req.body && 'correo' in req.body) {
      throw new ErrorHttp(400, 'El correo se cambia desde "Cambiar correo", con verificación');
    }
    next();
  }, validar(esquemas.perfil), async (req, res) => res.json(await servicios.perfil.actualizar(req.usuario.id, req.datos)));

  router.put('/perfil/foto', subida, async (req, res) => {
    if (!req.file) throw new ErrorHttp(400, 'Elige una foto');
    res.json(await servicios.perfil.cambiarFoto(req.usuario.id, req.file.buffer));
  });
  router.delete('/perfil/foto', async (req, res) => res.json(await servicios.perfil.quitarFoto(req.usuario.id)));

  // HU-06
  router.post('/correo/solicitar', limitar(LIMITES.clave, true), validar(esquemas.solicitarCorreo),
    async (req, res) => res.json(await servicios.correo.solicitar(req.usuario.id, req.datos)));
  router.post('/correo/confirmar', limitar(LIMITES.codigo, true), validar(esquemas.confirmarCorreo),
    async (req, res) => res.json(await servicios.correo.confirmar(req.usuario.id, req.datos)));

  // HU-32
  router.get('/notificaciones', async (req, res) =>
    res.json({ preferencias: await servicios.notificaciones.leer(req.usuario.id) }));
  router.put('/notificaciones', validar(esquemas.notificaciones), async (req, res) =>
    res.json({ preferencias: await servicios.notificaciones.guardar(req.usuario.id, req.datos.preferencias) }));

  // HU-35
  router.patch('/region', validar(esquemas.region), async (req, res) =>
    res.json(await servicios.region.actualizar(req.usuario.id, req.datos)));

  // HU-33
  router.get('/resenas', async (req, res) => res.json({ resenas: await servicios.resenas.mias(req.usuario.id) }));
  router.get('/resenas/reserva/:reservaId', validar(esquemas.reservaId, 'params'), async (req, res) =>
    res.json(await servicios.resenas.estadoDeReserva(req.usuario.id, req.datos.reservaId)));
  router.post('/resenas', validar(esquemas.resena), async (req, res) =>
    res.status(201).json(await servicios.resenas.crear(req.usuario.id, req.datos)));

  // HU-37 y HU-39
  router.get('/cierre/pendientes', async (req, res) =>
    res.json(await servicios.cierre.pendientes({ usuarioId: req.usuario.id, rol: req.usuario.rol })));
  router.post('/cierre/desactivar', limitar(LIMITES.clave, true), validar(esquemas.desactivar),
    async (req, res) => res.json(await servicios.cierre.desactivar(req.usuario.id, req.datos)));

  // HU-41 (solo administradores)
  router.get('/admin/cuentas', requerirRol('admin'), validar(esquemas.listadoAdmin, 'query'),
    async (req, res) => res.json(await servicios.admin.listar(req.datos)));
  router.get('/admin/cuentas/:id/historial', requerirRol('admin'), validar(esquemas.usuarioId, 'params'),
    async (req, res) => res.json(await servicios.admin.historial(req.datos.id)));

  router.use((req, res, next) => next(new ErrorHttp(404, 'Ruta no encontrada')));
  router.use(manejarErrores);
  return router;
}
