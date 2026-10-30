import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/modules/auth';

export default function ProtectedRoute() {
  const { usuario } = useAuth();
  return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}