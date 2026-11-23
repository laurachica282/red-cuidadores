import { traducir } from '@/modules/region';
import './i18n.js';

// Punto desde donde busca el viajero ({ etiqueta, barrio, ciudad, lat, lng }).
// Solo vive en este navegador: es un dato de la búsqueda, no del perfil.
const CLAVE = 'busqueda.punto';

export function leerPunto() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE));
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) return null;
    // Puntos guardados antes de traducir la app traían el texto fijo en español: se deja que lo ponga etiquetaPunto.
    return ['Punto en el mapa', 'Mi ubicación', 'Ubicando…'].includes(p.etiqueta) ? { ...p, etiqueta: '' } : p;
  } catch {
    return null;
  }
}

export function guardarPunto(punto) {
  try {
    if (punto) localStorage.setItem(CLAVE, JSON.stringify(punto));
    else localStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento: la búsqueda funciona igual durante la visita */ }
}

// Texto de un punto sin dirección conocida (mi ubicación o un punto del mapa), en el idioma actual.
export const etiquetaPunto = (p) =>
  p.etiqueta || traducir(p.miUbicacion ? 'busqueda.miUbicacion' : 'busqueda.puntoEnMapa');

// "Chapinero, Bogotá": lo corto que se muestra arriba en la búsqueda.
export const nombreCorto = (p) => [p.barrio, p.ciudad].filter(Boolean).join(', ') || etiquetaPunto(p);

// GPS del navegador (pide permiso). Resuelve { lat, lng } o falla con un mensaje para mostrar.
export function obtenerMiUbicacion() {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) return rechazar(new Error(traducir('busqueda.error.sinGeolocalizacion')));
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => rechazar(new Error(traducir('busqueda.error.ubicacion'))),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Centro del mapa cuando aún no hay punto (Bogotá).
export const CENTRO_POR_DEFECTO = { lat: 4.6533, lng: -74.0836 };
