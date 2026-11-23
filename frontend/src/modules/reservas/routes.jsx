import MisReservasPage from './pages/MisReservasPage.jsx';
import NuevaReservaPage from './pages/NuevaReservaPage.jsx';
import AdminCancelacionesPage from './pages/AdminCancelacionesPage.jsx';

export const privateRoutes = [
  { path: '/reservas', element: <MisReservasPage /> },
  { path: '/reservas/nueva/:cuidadorId', element: <NuevaReservaPage /> },
  // Administración: cancelaciones de cuidadores (la página misma revisa que sea admin).
  { path: '/admin/cancelaciones', element: <AdminCancelacionesPage /> },
];
