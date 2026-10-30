import LoginPage from './pages/LoginPage.jsx';
import RegistroPage from './pages/RegistroPage.jsx';

export const publicRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },
];