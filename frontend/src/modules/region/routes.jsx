import CuidadoresRegionPage from './pages/CuidadoresRegionPage.jsx';
import RegionPage from './pages/RegionPage.jsx';
import TerminosPage from './pages/TerminosPage.jsx';

export const publicRoutes = [
  { path: '/terminos', element: <TerminosPage /> },
];

export const privateRoutes = [
  { path: '/configuracion/region', element: <RegionPage /> },
  { path: '/region/cuidadores', element: <CuidadoresRegionPage /> },
];
