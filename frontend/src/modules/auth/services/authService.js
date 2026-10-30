import { api } from '@/shared/api/client.js';

export const login = (correo, clave) =>
  api('/auth/login', { metodo: 'POST', cuerpo: { correo, clave } });

export const registrar = (nombre, correo, clave, rol) =>
  api('/auth/registro', { metodo: 'POST', cuerpo: { nombre, correo, clave, rol } });

export const verificarCorreo = (correo, codigo) =>
  api('/auth/verificar-correo', { metodo: 'POST', cuerpo: { correo, codigo } });

export const reenviarCodigo = (correo) =>
  api('/auth/reenviar-codigo', { metodo: 'POST', cuerpo: { correo } });

export const recuperarClave = (correo) =>
  api('/auth/recuperar', { metodo: 'POST', cuerpo: { correo } });

export const verificarCodigoRecuperacion = (correo, codigo) =>
  api('/auth/recuperar/verificar', { metodo: 'POST', cuerpo: { correo, codigo } });

export const restablecerClave = (token, clave) =>
  api('/auth/restablecer-clave', { metodo: 'POST', cuerpo: { token, clave } });
