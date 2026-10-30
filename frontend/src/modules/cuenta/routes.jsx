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
import { RUTAS } from './rutas.js';

// HU-40: el usuario desactivado no tiene sesión, así que esta ruta es pública.
export const publicRoutes = [
  { path: RUTAS.reactivar, element: <ReactivarCuentaPage /> },
];

export const privateRoutes = [
  { path: RUTAS.configuracion, element: <CuentaPage /> },
  { path: RUTAS.datos, element: <DatosPersonalesPage /> },
  { path: RUTAS.correo, element: <CambiarCorreoPage /> },
  { path: RUTAS.notificaciones, element: <NotificacionesPage /> },
  { path: RUTAS.region, element: <RegionPage /> },
  { path: RUTAS.resenas, element: <ResenasPage /> },
  { path: RUTAS.nuevaResenaPatron, element: <NuevaResenaPage /> },
  { path: RUTAS.desactivar, element: <DesactivarCuentaPage /> },
  { path: RUTAS.cuentasDesactivadas, element: <CuentasDesactivadasPage /> },
];
