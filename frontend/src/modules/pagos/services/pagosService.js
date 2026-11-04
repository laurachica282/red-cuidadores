import { api } from '@/shared/api/client.js';

export const detectarPais = (lat, lng) => api(`/pagos/pais-detectado?lat=${lat}&lng=${lng}`);
export const pasarelaDePais = (pais) => api(`/pagos/pasarelas/${pais}`);
export const obtenerMiPais = () => api('/region/mi-region');
// El país nuevo trae su idioma y moneda por defecto (RN-6).
export const cambiarMiPais = (pais) => api('/region/mi-region', { metodo: 'PUT', cuerpo: { pais } });