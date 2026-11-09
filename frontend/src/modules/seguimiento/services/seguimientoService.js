import { api } from '@/shared/api/client.js';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const ORIGEN = API.replace(/\/api\/?$/, '');

// Fotos subidas (/uploads/...) y fotos de perfil (/cuenta/fotos/..., relativas a la API).
export const urlArchivo = (ruta) => {
  if (!ruta) return null;
  return ruta.startsWith('/uploads/') ? ORIGEN + ruta : API + ruta;
};

export const historial = () => api('/seguimiento/reservas');
export const detalle = (id) => api(`/seguimiento/reservas/${id}`);

// HU-31: `despues` es el id del último mensaje que ya se tiene.
export const leerMensajes = (id, despues = 0) => api(`/seguimiento/reservas/${id}/mensajes?despues=${despues}`);
export const enviarMensaje = (id, texto) => api(`/seguimiento/reservas/${id}/mensajes`, { metodo: 'POST', cuerpo: { texto } });

// HU-28
export const alertar = (id, mensaje) => api(`/seguimiento/reservas/${id}/emergencia`, { metodo: 'POST', cuerpo: { mensaje } });
export const leerContacto = () => api('/seguimiento/contacto-emergencia');
export const guardarContacto = (datos) => api('/seguimiento/contacto-emergencia', { metodo: 'PUT', cuerpo: datos });
export const veterinarios = () => api('/seguimiento/mascotas/veterinarios');
export const guardarVeterinario = (mascotaId, datos) =>
  api(`/seguimiento/mascotas/${mascotaId}/veterinario`, { metodo: 'PUT', cuerpo: datos });

// Campana de notificaciones
export const notificaciones = () => api('/seguimiento/notificaciones');
// Abrir la bandeja deja la campana en 0; tocar un aviso (o "Marcar leídas") le quita el resaltado.
export const marcarVistas = () => api('/seguimiento/notificaciones/vistas', { metodo: 'POST' });
export const marcarLeida = (avisoId) => api(`/seguimiento/notificaciones/${encodeURIComponent(avisoId)}/leida`, { metodo: 'POST' });
export const marcarLeidas = () => api('/seguimiento/notificaciones/leidas', { metodo: 'POST' });

// HU-30: el reporte lleva foto, así que va como FormData (el navegador pone el Content-Type).
export async function crearReporte(id, { titulo, nota, foto }) {
  const datos = new FormData();
  datos.append('titulo', titulo);
  if (nota) datos.append('nota', nota);
  if (foto) datos.append('foto', foto);
  const token = localStorage.getItem('token');
  let resp;
  try {
    resp = await fetch(`${API}/seguimiento/reservas/${id}/reportes`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: datos,
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }
  const cuerpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(cuerpo.error ?? 'No se pudo subir el reporte');
  return cuerpo;
}
