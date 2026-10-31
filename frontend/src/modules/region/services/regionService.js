import { api } from '@/shared/api/client.js';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const urlFotoCuidador = (id) => `${API}/cuidadores/fotos/${id}`;
export const listarPaises = () => api('/region/paises');
export const obtenerTerminos = (pais) => api(`/region/terminos/${pais}`);
export const obtenerMiRegion = () => api('/region/mi-region');
export const guardarMiRegion = ({ pais, idioma, moneda }) =>
  api('/region/mi-region', { metodo: 'PUT', cuerpo: { pais, idioma, moneda } });
// HU-36: solo cuidadores verificados y vigentes de la región de quien consulta.
export const listarCuidadoresDeMiRegion = (ciudad = '') =>
  api(`/region/cuidadores${ciudad ? `?ciudad=${encodeURIComponent(ciudad)}` : ''}`);
