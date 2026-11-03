import BuscarPage from './pages/BuscarPage.jsx';
import PerfilCuidadorPage from './pages/PerfilCuidadorPage.jsx';

export const privateRoutes = [
  { path: '/inicio', element: <BuscarPage /> },
  { path: '/cuidadores/:id', element: <PerfilCuidadorPage /> },
];
