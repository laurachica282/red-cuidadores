import { Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage.jsx';
import EmergenciaPage from './pages/EmergenciaPage.jsx';
import NotificacionesPage from './pages/NotificacionesPage.jsx';
import SeguimientoPage from './pages/SeguimientoPage.jsx';

export const privateRoutes = [
  // El historial vive en la lista de reservas (filtros Activas / Pasadas / Canceladas).
  { path: '/historial', element: <Navigate to="/reservas" replace /> },
  { path: '/reservas/:id/seguimiento', element: <SeguimientoPage /> },
  { path: '/reservas/:id/chat', element: <ChatPage /> },
  { path: '/emergencia', element: <EmergenciaPage /> },
  { path: '/notificaciones', element: <NotificacionesPage /> },
];
