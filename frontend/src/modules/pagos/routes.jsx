import PaisPage from './pages/PaisPage.jsx';
import PagarPage from './pages/PagarPage.jsx';

export const privateRoutes = [
  { path: '/pagos/pais', element: <PaisPage /> },
  { path: '/pagos/reserva/:id', element: <PagarPage /> },
];