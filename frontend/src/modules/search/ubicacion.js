// Punto desde donde busca el viajero ({ etiqueta, barrio, ciudad, lat, lng }).
// Solo vive en este navegador: es un dato de la búsqueda, no del perfil.
const CLAVE = 'busqueda.punto';

export function leerPunto() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE));
    return Number.isFinite(p?.lat) && Number.isFinite(p?.lng) ? p : null;
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

// "Chapinero, Bogotá": lo corto que se muestra arriba en la búsqueda.
export const nombreCorto = (p) => [p.barrio, p.ciudad].filter(Boolean).join(', ') || p.etiqueta;

// GPS del navegador (pide permiso). Resuelve { lat, lng } o falla con un mensaje para mostrar.
export function obtenerMiUbicacion() {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) return rechazar(new Error('Tu navegador no permite compartir la ubicación.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => rechazar(new Error('No pudimos obtener tu ubicación. Revisa el permiso del navegador.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Centro del mapa cuando aún no hay punto (Bogotá).
export const CENTRO_POR_DEFECTO = { lat: 4.6533, lng: -74.0836 };
