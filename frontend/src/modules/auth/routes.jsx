import LoginPage from './pages/LoginPage.jsx';
import RegistroPage from './pages/RegistroPage.jsx';
import VerificarCorreoPage from './pages/VerificarCorreoPage.jsx';

export const publicRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },
  { path: '/verificar-correo', element: <VerificarCorreoPage /> },
];