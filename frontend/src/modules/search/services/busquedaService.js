import { api } from '@/shared/api/client.js';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const urlFotoCuidador = (id) => `${API}/cuidadores/fotos/${id}`;
// El backend devuelve la ruta relativa a la API (ej.: /cuenta/fotos/abc.jpg).
export const urlApi = (ruta) => (ruta ? API + ruta : null);

// HU-15: filtros { q, ciudad, tipo, precioMin, precioMax, lat, lng, radioKm, desde, hasta, orden }.
// Los vacíos no se envían.
export function buscarCuidadores(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const qs = params.toString();
  return api(qs ? `/busqueda/cuidadores?${qs}` : '/busqueda/cuidadores');
}

// HU-16: perfil con fotos, reseñas, insignia y tarifa.
// Con fechas ({ desde, hasta }) dice si el cuidador está libre (disponible).
export const obtenerPerfilCuidador = (id, { desde, hasta } = {}) =>
  api(desde && hasta ? `/busqueda/cuidadores/${id}?desde=${desde}&hasta=${hasta}` : `/busqueda/cuidadores/${id}`);

// Mapa: dirección escrita → lugares posibles, y punto del mapa → dirección.
// cerca: { lat, lng } opcional para preferir lugares de esa zona.
export const buscarDirecciones = (texto, cerca) =>
  api(`/busqueda/direcciones?q=${encodeURIComponent(texto)}${cerca ? `&lat=${cerca.lat}&lng=${cerca.lng}` : ''}`);
export const direccionDe = (lat, lng) => api(`/busqueda/direcciones/inversa?lat=${lat}&lng=${lng}`);
