import { api } from '@/shared/api/client.js';
import { obtenerDispositivoId } from './dispositivo.js';

export const login = (correo, clave) =>
  api('/auth/login', { metodo: 'POST', cuerpo: { correo, clave, dispositivoId: obtenerDispositivoId() } });

// credential: id_token que entrega el botón de Google.
export const loginGoogle = (credential) =>
  api('/auth/google', { metodo: 'POST', cuerpo: { credential, dispositivoId: obtenerDispositivoId() } });

export const verificar2fa =(token2fa, codigo) =>
  api('/auth/2fa/verificar', { metodo: 'POST', cuerpo: { token2fa, codigo } });

export const reenviar2fa = (token2fa) =>
  api('/auth/2fa/reenviar', { metodo: 'POST', cuerpo: { token2fa } });

// Cuentas sin clave confirman con `codigo` (ver pedirCodigoConfirmacion) en vez de `clave`.
export const cambiar2fa = (activo, clave, codigo) =>
  api('/auth/2fa', { metodo: 'PATCH', cuerpo: { activo, clave, codigo, dispositivoId: obtenerDispositivoId() } });

export const pedirCodigoConfirmacion = () => api('/auth/confirmacion/codigo', { metodo: 'POST' });

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

export const cambiarClave = ({ claveActual, codigo, claveNueva, cerrarOtras }) =>
  api('/auth/cambiar-clave', { metodo: 'POST', cuerpo: { claveActual, codigo, claveNueva, cerrarOtras } });

export const logout = () => api('/auth/logout', { metodo: 'POST' });

export const listarSesiones = () => api('/auth/sesiones');

export const cerrarSesionDispositivo = (id) => api(`/auth/sesiones/${id}`, { metodo: 'DELETE' });

export const cerrarTodasLasSesiones = () => api('/auth/sesiones/cerrar-todas', { metodo: 'POST' });
