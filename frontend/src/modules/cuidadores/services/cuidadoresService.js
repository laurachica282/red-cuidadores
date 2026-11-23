import { api } from '@/shared/api/client.js';
import { traducirMensajeServidor } from '@/shared/api/mensajesServidor.js';
import { idiomaActual, traducir } from '@/modules/region';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// El cliente compartido solo envía JSON; para subir archivos se usa FormData.
async function enviarFormulario(ruta, formData) {
  const token = localStorage.getItem('token');
  let resp;
  try {
    resp = await fetch(`${API}${ruta}`, {
      method: 'POST',
      headers: { 'Accept-Language': idiomaActual(), ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
  } catch {
    throw new Error(traducir('comun.sin_conexion'));
  }
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw Object.assign(new Error(traducirMensajeServidor(datos.error) ?? traducir('comun.error_generico')),
      { status: resp.status, original: datos.error, datos });
  }
  return datos;
}

export const urlFoto = (id) => `${API}/cuidadores/fotos/${id}`;

// HU-10: perfil
export const obtenerMiPerfil = () => api('/cuidadores/mi-perfil');
export const guardarMiPerfil = (cuerpo) => api('/cuidadores/mi-perfil', { metodo: 'PUT', cuerpo });
export const quitarFoto = (id) => api(`/cuidadores/mi-perfil/fotos/${id}`, { metodo: 'DELETE' });
export const subirFotos = (archivos) => {
  const f = new FormData();
  archivos.forEach((a) => f.append('fotos', a));
  return enviarFormulario('/cuidadores/mi-perfil/fotos', f);
};

// HU-11: verificación de antecedentes
export const obtenerVerificacion = () => api('/cuidadores/verificacion');
export const enviarVerificacion = ({ documento, selfie, antecedentes }) => {
  const f = new FormData();
  f.append('documento', documento);
  f.append('selfie', selfie);
  f.append('antecedentes', antecedentes);
  f.append('aceptaDatos', 'true');
  return enviarFormulario('/cuidadores/verificacion', f);
};

// HU-12 y HU-14: administrador
export const listarVerificaciones = (estado = 'en_revision') => api(`/cuidadores/admin/verificaciones?estado=${estado}`);
export const listarCuidadoresAdmin = () => api('/cuidadores/admin/cuidadores');
export const aprobarVerificacion = (id) => api(`/cuidadores/admin/verificaciones/${id}/aprobar`, { metodo: 'POST' });
export const rechazarVerificacion = (id, motivo) =>
  api(`/cuidadores/admin/verificaciones/${id}/rechazar`, { metodo: 'POST', cuerpo: { motivo } });
export const suspenderCuidador = (id, motivo) =>
  api(`/cuidadores/admin/cuidadores/${id}/suspender`, { metodo: 'POST', cuerpo: { motivo } });

// Los documentos van cifrados y piden sesión: se descargan con el token y se abren en otra pestaña.
export async function abrirArchivo(id) {
  const ventana = window.open('', '_blank');
  try {
    const resp = await fetch(`${API}/cuidadores/admin/archivos/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Accept-Language': idiomaActual() },
    });
    if (!resp.ok) throw new Error(traducir('admin.error_archivo'));
    const url = URL.createObjectURL(await resp.blob());
    if (ventana) ventana.location = url;
    else window.location = url;
  } catch (e) {
    ventana?.close();
    throw e;
  }
}
