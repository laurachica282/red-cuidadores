import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import * as auth from '@/modules/auth';
import * as busqueda from '@/modules/search';
import * as mascotas from '@/modules/mascotas';

// Cada módulo aporta sus rutas. Para sumar uno nuevo, se agrega a esta lista.
const modulos = [auth, busqueda, mascotas];
const rutasPublicas = modulos.flatMap((m) => m.publicRoutes ?? []);
const rutasPrivadas = modulos.flatMap((m) => m.privateRoutes ?? []);

export default function App() {
  return (
    <Routes>
      {rutasPublicas.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}

      <Route element={<ProtectedRoute />}>
        {rutasPrivadas.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}