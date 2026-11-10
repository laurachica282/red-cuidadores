import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import * as auth from '@/modules/auth';
import * as busqueda from '@/modules/search';
import * as cuenta from '@/modules/cuenta';
import * as cuidadores from '@/modules/cuidadores';
import * as mascotas from '@/modules/mascotas';
import * as region from '@/modules/region';
import * as seguimiento from '@/modules/seguimiento';
import LayoutPrivado from '@/shared/components/LayoutPrivado.jsx';
import * as pagos from '@/modules/pagos';
import * as reservas from '@/modules/reservas';

// Cada módulo aporta sus rutas. Para sumar uno nuevo, se agrega a esta lista.
const modulos = [auth, busqueda, cuenta, cuidadores, mascotas, pagos, region, reservas, seguimiento];
const rutasPublicas = modulos.flatMap((m) => m.publicRoutes ?? []);
const rutasPrivadas = modulos.flatMap((m) => m.privateRoutes ?? []);

export default function App() {
  return (
    <Routes>
      {rutasPublicas.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutPrivado />}>
          {rutasPrivadas.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}