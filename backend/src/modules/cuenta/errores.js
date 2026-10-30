import multer from 'multer';
import { FOTO } from './config.js';

// Error con código HTTP. Todo lo que el usuario puede corregir se lanza con esta clase;
// lo demás se registra y se responde con un mensaje genérico.
export class ErrorHttp extends Error {
  constructor(estado, mensaje, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.extra = extra;
  }
}

// Mismo formato de respuesta que usa el login: { error: '...' }.
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorHttp) {
    return res.status(err.estado).json({ error: err.message, ...err.extra });
  }
  if (err instanceof multer.MulterError) {
    const mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? `La foto pesa demasiado (máximo ${FOTO.maxBytes / 1024 / 1024} MB)`
      : 'No se pudo leer la foto';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: mensaje });
  }
  console.error(err);
  res.status(500).json({ error: 'Algo salió mal. Inténtalo de nuevo.' });
}
