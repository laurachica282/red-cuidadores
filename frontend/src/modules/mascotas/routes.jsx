import MisMascotasPage from './pages/MisMascotasPage.jsx';
import FichaMascotaPage from './pages/FichaMascotaPage.jsx';
import MascotaFinaPage from './pages/MascotaFinaPage.jsx';

// Todas requieren sesión (HU-23 y HU-24)
export const privateRoutes = [
  { path: '/mascotas', element: <MisMascotasPage /> },
  { path: '/mascotas/nueva', element: <FichaMascotaPage /> },
  { path: '/mascotas/:id/editar', element: <FichaMascotaPage /> },
  { path: '/mascotas/:id/fina', element: <MascotaFinaPage /> },
];
