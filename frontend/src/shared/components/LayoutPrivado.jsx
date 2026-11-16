import { Outlet } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion.jsx';

export default function LayoutPrivado() {
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