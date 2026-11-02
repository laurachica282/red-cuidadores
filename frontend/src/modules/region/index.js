export { publicRoutes, privateRoutes } from './routes.jsx';
// Para que otros módulos muestren textos en el idioma de la persona: const { t } = useIdioma();
export { useIdioma, formatearPrecio } from './i18n/i18n.js';
// Para que la búsqueda (otro módulo) pida solo los cuidadores de la región de la persona.
export { listarCuidadoresDeMiRegion } from './services/regionService.js';
