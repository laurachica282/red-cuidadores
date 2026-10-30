import CambiarCorreoPage from './pages/CambiarCorreoPage.jsx';
import CuentaPage from './pages/CuentaPage.jsx';
import CuentasDesactivadasPage from './pages/CuentasDesactivadasPage.jsx';
import DatosPersonalesPage from './pages/DatosPersonalesPage.jsx';
import DesactivarCuentaPage from './pages/DesactivarCuentaPage.jsx';
import NotificacionesPage from './pages/NotificacionesPage.jsx';
import NuevaResenaPage from './pages/NuevaResenaPage.jsx';
import ReactivarCuentaPage from './pages/ReactivarCuentaPage.jsx';
import RegionPage from './pages/RegionPage.jsx';
import ResenasPage from './pages/ResenasPage.jsx';

// HU-40: el usuario desactivado no tiene sesión, así que esta ruta es pública.
export const publicRoutes = [
  { path: '/reactivar', element: <ReactivarCuentaPage /> },
];

export const privateRoutes = [
  { path: '/cuenta', element: <CuentaPage /> },
  { path: '/cuenta/datos', element: <DatosPersonalesPage /> },
  { path: '/cuenta/correo', element: <CambiarCorreoPage /> },
  { path: '/cuenta/notificaciones', element: <NotificacionesPage /> },
  { path: '/cuenta/region', element: <RegionPage /> },
  { path: '/cuenta/resenas', element: <ResenasPage /> },
  { path: '/cuenta/resenas/nueva/:reservaId', element: <NuevaResenaPage /> },
  { path: '/cuenta/desactivar', element: <DesactivarCuentaPage /> },
  { path: '/cuenta/admin/desactivadas', element: <CuentasDesactivadasPage /> },
];
