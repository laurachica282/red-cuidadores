import { Router } from 'express';
import requiereSesion from './mascotas.sesion.js';
import * as subir from './mascotas.subida.js';
import * as c from './mascotas.controller.js';

const router = Router();
router.use(requiereSesion);

router.get('/', c.listar);
router.post('/', subir.foto, c.crear);
router.get('/:id', c.obtener);
router.put('/:id', subir.foto, c.editar);
router.delete('/:id', c.desactivar);
router.patch('/:id/fina', subir.comprobante, c.marcarFina);

export default router;
