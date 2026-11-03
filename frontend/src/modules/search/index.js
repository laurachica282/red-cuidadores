export { privateRoutes } from './routes.jsx';
// Para que el perfil del cuidador (módulo cuidadores, HU-10) pida la dirección con el mismo mapa:
// <MapaDireccion valor={ubicacion} onCambiar={setUbicacion} /> → { etiqueta, barrio, ciudad, lat, lng }.
export { default as MapaDireccion } from './components/MapaDireccion.jsx';
