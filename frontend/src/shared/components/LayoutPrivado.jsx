import { Outlet } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion.jsx';

export default function LayoutPrivado() {
  return (
    <>
      <div style={{ paddingBottom: 80 }}>
        <Outlet />
      </div>
      <BarraNavegacion />
    </>
  );
}