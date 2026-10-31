import { api } from '@/shared/api/client.js';
import { obtenerDispositivoId } from './dispositivo.js';

export const login = (correo, clave) =>
  api('/auth/login', { metodo: 'POST', cuerpo: { correo, clave, dispositivoId: obtenerDispositivoId() } });

export const verificar2fa = (token2fa, codigo) =>
  api('/auth/2fa/verificar', { metodo: 'POST', cuerpo: { token2fa, codigo } });

export const reenviar2fa = (token2fa) =>
  api('/auth/2fa/reenviar', { metodo: 'POST', cuerpo: { token2fa } });

export const cambiar2fa = (activo, clave) =>
  api('/auth/2fa', { metodo: 'PATCH', cuerpo: { activo, clave, dispositivoId: obtenerDispositivoId() } });

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

export const cambiarClave = ({ claveActual, claveNueva, cerrarOtras }) =>
  api('/auth/cambiar-clave', { metodo: 'POST', cuerpo: { claveActual, claveNueva, cerrarOtras } });

export const logout = () => api('/auth/logout', { metodo: 'POST' });

export const listarSesiones = () => api('/auth/sesiones');

export const cerrarSesionDispositivo = (id) => api(`/auth/sesiones/${id}`, { metodo: 'DELETE' });

export const cerrarTodasLasSesiones = () => api('/auth/sesiones/cerrar-todas', { metodo: 'POST' });
