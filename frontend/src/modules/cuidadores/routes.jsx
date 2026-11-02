import SoloRol from './components/SoloRol.jsx';
import AdminCuidadoresPage from './pages/AdminCuidadoresPage.jsx';
import PanelCuidadorPage from './pages/PanelCuidadorPage.jsx';
import PerfilCuidadorPage from './pages/PerfilCuidadorPage.jsx';
import VerificacionPage from './pages/VerificacionPage.jsx';
import VistaPreviaPage from './pages/VistaPreviaPage.jsx';

export const privateRoutes = [
  { path: '/cuidador', element: <SoloRol rol="cuidador"><PanelCuidadorPage /></SoloRol> },
  { path: '/cuidador/perfil', element: <SoloRol rol="cuidador"><PerfilCuidadorPage /></SoloRol> },
  { path: '/cuidador/verificacion', element: <SoloRol rol="cuidador"><VerificacionPage /></SoloRol> },
  { path: '/cuidador/vista-previa', element: <SoloRol rol="cuidador"><VistaPreviaPage /></SoloRol> },
  { path: '/admin/cuidadores', element: <SoloRol rol="admin"><AdminCuidadoresPage /></SoloRol> },
];
