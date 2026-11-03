import jwt from 'jsonwebtoken';
import { enviarCodigo } from './correo.service.js';
import { crearCodigo, segundosParaReenviar } from './codigos.service.js';
import { crearSesion, DIAS_SESION } from './sesiones.service.js';
import { esConfiable, hashDispositivo } from './dispositivos.service.js';

// Lo común a todas las formas de entrar (clave, Google, Microsoft…), después de saber quién es el usuario.

export const MINUTOS_BLOQUEO = 15; // debe coincidir con el INTERVAL de registrarFalloClave (auth.routes.js)

export const respuestaBloqueo = (minutos) => ({
  error: `Demasiados intentos. Intenta de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
  codigo: 'CUENTA_BLOQUEADA',
  minutos,
});

// sid: id de la fila en sesiones; verificarToken rechaza el token si esa sesión se cerró.
export const crearToken = (u, sid) =>
  jwt.sign({ id: u.id, rol: u.rol, sid }, process.env.JWT_SECRET, { expiresIn: `${DIAS_SESION}d` });

// Token del paso intermedio del login con verificación en dos pasos; dh: hash del dispositivo que se va a confiar.
export const crearToken2fa = (u, hash) =>
  jwt.sign({ id: u.id, proposito: '2fa', dh: hash }, process.env.JWT_SECRET, { expiresIn: '10m' });

// Solo lo que el frontend puede ver (nunca la clave cifrada). tiene_clave: false en cuentas solo sociales.
export const publico = (u) => ({
  id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol,
  pais: u.pais, idioma: u.idioma, moneda: u.moneda, dos_pasos: u.dos_pasos,
  tiene_clave: u.clave_hash != null,
});

// Manda el código 2FA salvo que se haya enviado uno hace menos de 60 s (ese sigue vigente).
export const enviarCodigo2fa = async (u) => {
  if ((await segundosParaReenviar(u.id, '2fa')) > 0) return;
  try {
    await enviarCodigo(u.correo, u.nombre, await crearCodigo(u.id, '2fa'), '2fa');
  } catch (e) {
    console.error('No se pudo enviar el código:', e.message);
  }
};

// Con el usuario ya identificado: cuenta activa, correo verificado, 2FA en equipo nuevo y sesión.
// Devuelve { http, cuerpo } para que cada ruta solo haga res.status(http).json(cuerpo).
export async function completarIngreso(u, req, dispositivoId) {
  if (!u.status) return { http: 403, cuerpo: { error: 'Esta cuenta está desactivada' } };
  if (!u.correo_verificado) {
    return { http: 403, cuerpo: { error: 'Debes verificar tu correo para ingresar', codigo: 'CORREO_SIN_VERIFICAR' } };
  }

  // Equipo nuevo con verificación en dos pasos: aún no hay sesión, primero el código.
  if (u.dos_pasos) {
    const hash = hashDispositivo(dispositivoId);
    if (!hash) return { http: 400, cuerpo: { error: 'No pudimos identificar este dispositivo' } };
    if (!(await esConfiable(u.id, hash))) {
      await enviarCodigo2fa(u);
      return { http: 200, cuerpo: { requiere2fa: true, token2fa: crearToken2fa(u, hash), correo: u.correo } };
    }
  }

  return { http: 200, cuerpo: { token: crearToken(u, await crearSesion(u.id, req)), usuario: publico(u) } };
}
