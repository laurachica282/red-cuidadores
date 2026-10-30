import { api } from '@/shared/api/client.js';

export const login = (correo, clave) =>
  api('/auth/login', { metodo: 'POST', cuerpo: { correo, clave } });

export const registrar = (nombre, correo, clave, rol) =>
  api('/auth/registro', { metodo: 'POST', cuerpo: { nombre, correo, clave, rol } });