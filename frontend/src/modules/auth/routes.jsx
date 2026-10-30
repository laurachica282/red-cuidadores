import LoginPage from './pages/LoginPage.jsx';
import RegistroPage from './pages/RegistroPage.jsx';
import VerificarCorreoPage from './pages/VerificarCorreoPage.jsx';
import RecuperarClavePage from './pages/RecuperarClavePage.jsx';
import NuevaClavePage from './pages/NuevaClavePage.jsx';

export const publicRoutes = [
  { path: '/recuperar', element: <RecuperarClavePage /> },
  { path: '/recuperar/codigo', element: <VerificarCorreoPage modo="recuperacion" /> },
  { path: '/recuperar/nueva-clave', element: <NuevaClavePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },
  { path: '/verificar-correo', element: <VerificarCorreoPage /> },
];