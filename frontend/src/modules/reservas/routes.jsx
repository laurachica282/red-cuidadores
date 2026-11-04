import MisReservasPage from './pages/MisReservasPage.jsx';
import NuevaReservaPage from './pages/NuevaReservaPage.jsx';

export const privateRoutes = [
  { path: '/reservas', element: <MisReservasPage /> },
  { path: '/reservas/nueva/:cuidadorId', element: <NuevaReservaPage /> },
];