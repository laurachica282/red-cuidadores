import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import BarraNavegacion from './BarraNavegacion.jsx';

// Pantallas que solo usa quien viaja (buscar, reservar, registrar mascotas, emergencia).
// Si entra un cuidador o un administrador (al iniciar sesión todos llegan a /inicio), va a su panel.
const PANEL_POR_ROL = { cuidador: '/cuidador', admin: '/admin/cuidadores' };
const SOLO_VIAJERO = [/^\/inicio$/, /^\/mascotas(\/|$)/, /^\/reservas\/nueva\//, /^\/cuidadores\//, /^\/emergencia$/];

export default function LayoutPrivado() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const panel = PANEL_POR_ROL[usuario?.rol];
  if (panel && SOLO_VIAJERO.some((r) => r.test(pathname))) {
    return <Navigate to={panel} replace />;
  }

  return (
    <>
      {/* --barra-espacio: lo que se fija abajo (botón Reservar, caja del chat...) queda encima de la barra. */}
      <div style={{ paddingBottom: 96, '--barra-espacio': '88px' }}>
        <Outlet />
      </div>
      <BarraNavegacion />
    </>
  );
}