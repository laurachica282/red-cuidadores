import { api } from '@/shared/api/client.js';

// Misma URL base que usa el cliente compartido (shared/api/client.js no la exporta).
export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// Las fotos llegan como "/cuenta/fotos/<archivo>", relativas a la API.
export const urlFoto = (foto) => (foto ? `${API}${foto}` : null);

// HU-09
export const obtenerPerfil = () => api('/cuenta/perfil');
export const actualizarPerfil = (cuerpo) => api('/cuenta/perfil', { metodo: 'PATCH', cuerpo });
export const quitarFoto = () => api('/cuenta/perfil/foto', { metodo: 'DELETE' });

// El cliente compartido manda JSON; la foto va como multipart.
export async function subirFoto(archivo) {
  const datos = new FormData();
  datos.append('foto', archivo);
  let resp;
  try {
    resp = await fetch(`${API}/cuenta/perfil/foto`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: datos,
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }
  const cuerpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(cuerpo.error ?? 'No se pudo subir la foto');
  return cuerpo;
}

// HU-06
export const solicitarCambioCorreo = (correo_nuevo, clave) =>
  api('/cuenta/correo/solicitar', { metodo: 'POST', cuerpo: { correo_nuevo, clave } });
export const confirmarCambioCorreo = (codigo) =>
  api('/cuenta/correo/confirmar', { metodo: 'POST', cuerpo: { codigo } });

// HU-32
export const obtenerNotificaciones = () => api('/cuenta/notificaciones');
// preferencias = { eventos: { reservas, reportes, mensajes, promociones }, canales: { push, correo, sms } }
export const guardarNotificaciones = (preferencias) =>
  api('/cuenta/notificaciones', { metodo: 'PUT', cuerpo: preferencias });

// HU-35
export const obtenerRegiones = () => api('/cuenta/regiones');
export const guardarRegion = (cuerpo) => api('/cuenta/region', { metodo: 'PATCH', cuerpo });

// HU-33
export const listarMisResenas = () => api('/cuenta/resenas');
export const estadoDeReserva = (reservaId) => api(`/cuenta/resenas/reserva/${reservaId}`);
export const crearResena = (cuerpo) => api('/cuenta/resenas', { metodo: 'POST', cuerpo });

// HU-37 y HU-39
export const obtenerPendientes = () => api('/cuenta/cierre/pendientes');
export const desactivarCuenta = (cuerpo) => api('/cuenta/cierre/desactivar', { metodo: 'POST', cuerpo });

// HU-40 (sin sesión)
export const solicitarReactivacion = (correo) =>
  api('/cuenta/reactivacion/solicitar', { metodo: 'POST', cuerpo: { correo } });
export const confirmarReactivacion = (correo, codigo) =>
  api('/cuenta/reactivacion/confirmar', { metodo: 'POST', cuerpo: { correo, codigo } });

// HU-41 (administrador)
export const listarCuentasDesactivadas = ({ pagina = 1, rol, estado } = {}) => {
  const q = new URLSearchParams({ pagina, ...(rol && { rol }), ...(estado && { estado }) });
  return api(`/cuenta/admin/cuentas?${q}`);
};
export const historialDeCuenta = (id) => api(`/cuenta/admin/cuentas/${id}/historial`);

// Mantiene al día los datos de sesión que guarda el login (nombre, país, moneda...), para que
// el resto de la app los vea sin recargar. Si el formato cambia, no pasa nada: se ignora.
export function sincronizarSesion(parcial) {
  try {
    const actual = JSON.parse(localStorage.getItem('usuario'));
    if (actual) localStorage.setItem('usuario', JSON.stringify({ ...actual, ...parcial }));
  } catch { /* sin sesión guardada */ }
}
