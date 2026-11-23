import { api } from '@/shared/api/client.js';
import { traducirMensajeServidor } from '@/shared/api/mensajesServidor.js';
import { traducir } from '@/modules/region';
import '../i18n.js';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
// Dirección base del servidor (sin /api), para mostrar las fotos subidas
const ORIGEN = API.replace(/\/api\/?$/, '');

export const urlArchivo = (ruta) => (ruta ? `${ORIGEN}${ruta}` : null);

// Lecturas y borrado: JSON, con el cliente compartido
export const listarMascotas = () => api('/mascotas');
export const obtenerMascota = (id) => api(`/mascotas/${id}`);
export const eliminarMascota = (id) => api(`/mascotas/${id}`, { metodo: 'DELETE' });

// Envíos con archivo: FormData. El navegador pone solo el Content-Type.
async function enviarFormulario(ruta, metodo, formData) {
  const token = localStorage.getItem('token');
  let resp;
  try {
    resp = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        'Accept-Language': document.documentElement.lang || 'es',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch {
    throw new Error(traducir('mascotas.error_conexion'));
  }
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw Object.assign(new Error(traducirMensajeServidor(datos.error) ?? traducir('mascotas.error_generico')), {
      status: resp.status,
      original: datos.error,
    });
  }
  return datos;
}

// HU-23: crear (sin id) o editar (con id) la ficha
export const guardarMascota = (id, formData) =>
  enviarFormulario(id ? `/mascotas/${id}` : '/mascotas', id ? 'PUT' : 'POST', formData);

// HU-24: marcar como fina (valor estimado + comprobante)
export const marcarFina = (id, formData) =>
  enviarFormulario(`/mascotas/${id}/fina`, 'PATCH', formData);
