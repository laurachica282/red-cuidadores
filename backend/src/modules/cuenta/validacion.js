import { z } from 'zod';
import { ErrorHttp } from './errores.js';
import {
  CANALES, EVENTOS_NOTIFICACION, MAX_COMENTARIO_RESENA, MOTIVOS_DESACTIVACION,
} from './config.js';
import { CODIGOS_IDIOMA, CODIGOS_MONEDA, CODIGOS_PAIS } from './regiones.js';

const texto = (etiqueta, min, max) =>
  z.string({ error: `${etiqueta} es obligatorio` })
    .trim()
    .min(min, `${etiqueta} es muy corto (mínimo ${min} caracteres)`)
    .max(max, `${etiqueta} es muy largo (máximo ${max} caracteres)`);

// Un campo opcional que se puede vaciar: '' llega como null y se guarda como NULL.
const textoOpcional = (etiqueta, min, max) =>
  z.union([z.literal('').transform(() => null), z.null(), texto(etiqueta, min, max)]);

const correo = z.string({ error: 'Escribe tu correo' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Escribe un correo válido').max(160, 'El correo es muy largo'));

const codigo = z.string({ error: 'Escribe el código' })
  .trim()
  .regex(/^\d{6}$/, 'El código tiene 6 dígitos');

const clave = z.string({ error: 'Escribe tu contraseña' }).min(1, 'Escribe tu contraseña').max(200);

export const esquemas = {
  // HU-09: nombre, teléfono, ciudad (la foto va aparte). El correo NO se cambia aquí (HU-06).
  perfil: z.object({
    nombre: texto('El nombre', 2, 120).optional(),
    telefono: textoOpcional('El teléfono', 7, 20)
      .refine((v) => v === null || /^\+?[0-9][0-9\s-]{5,18}[0-9]$/.test(v), 'El teléfono solo lleva números, espacios o guiones')
      .optional(),
    ciudad: textoOpcional('La ciudad', 2, 80).optional(),
  }).refine((d) => Object.keys(d).length > 0, 'No hay nada que actualizar'),

  // HU-06
  solicitarCorreo: z.object({ correo_nuevo: correo, clave }),
  confirmarCorreo: z.object({ codigo }),

  // HU-32: dos listas, eventos y canales. Se puede mandar solo lo que cambió.
  notificaciones: z.object({
    eventos: z.object(Object.fromEntries(EVENTOS_NOTIFICACION.map((e) => [e, z.boolean()]))).partial().strict().optional(),
    canales: z.object(Object.fromEntries(CANALES.map((c) => [c, z.boolean()]))).partial().strict().optional(),
  }).strict().refine(
    (d) => Object.keys(d.eventos ?? {}).length + Object.keys(d.canales ?? {}).length > 0,
    'No hay preferencias para guardar',
  ),

  // HU-35 y mockup 17
  region: z.object({
    idioma: z.enum(CODIGOS_IDIOMA, { error: 'Ese idioma no está disponible' }).optional(),
    pais: z.enum(CODIGOS_PAIS, { error: 'Ese país no está disponible' }).optional(),
    moneda: z.enum(CODIGOS_MONEDA, { error: 'Esa moneda no está disponible' }).optional(),
  }).refine((d) => d.idioma || d.pais || d.moneda, 'Elige un idioma, un país o una moneda'),

  // HU-33
  resena: z.object({
    reserva_id: z.coerce.number({ error: 'Reserva no válida' }).int().positive('Reserva no válida'),
    calificacion: z.number({ error: 'Elige de 1 a 5 estrellas' }).int().min(1, 'Elige de 1 a 5 estrellas').max(5, 'Elige de 1 a 5 estrellas'),
    comentario: z.string().trim().max(MAX_COMENTARIO_RESENA, `El comentario admite máximo ${MAX_COMENTARIO_RESENA} caracteres`)
      .transform((v) => v || null).nullish(),
  }),
  reservaId: z.object({ reservaId: z.coerce.number().int().positive('Reserva no válida') }),

  // HU-39
  desactivar: z.object({
    clave,
    motivo: z.enum(MOTIVOS_DESACTIVACION, { error: 'Elige un motivo' }),
    detalle: z.string().trim().max(500, 'El detalle admite máximo 500 caracteres').transform((v) => v || null).nullish(),
  }),

  // HU-40
  solicitarReactivacion: z.object({ correo }),
  confirmarReactivacion: z.object({ correo, codigo }),

  // HU-41
  listadoAdmin: z.object({
    pagina: z.coerce.number().int().min(1).default(1),
    tamano: z.coerce.number().int().min(1).max(100).default(20),
    rol: z.enum(['viajero', 'cuidador', 'admin']).optional(),
    estado: z.enum(['desactivada', 'reactivada']).optional(),
  }),
  usuarioId: z.object({ id: z.coerce.number().int().positive('Cuenta no válida') }),
};

// Valida req[donde] y deja el resultado limpio en req.datos.
export const validar = (esquema, donde = 'body') => (req, res, next) => {
  const r = esquema.safeParse(req[donde] ?? {});
  if (!r.success) {
    const campos = {};
    for (const i of r.error.issues) campos[i.path.join('.') || '_'] ??= i.message;
    throw new ErrorHttp(400, r.error.issues[0].message, { campos });
  }
  req.datos = { ...(req.datos ?? {}), ...r.data };
  next();
};
