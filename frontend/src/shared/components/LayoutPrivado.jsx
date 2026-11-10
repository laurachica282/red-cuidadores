import { Outlet } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion.jsx';

export default function LayoutPrivado() {
  return (
    <>
      <div style={{ paddingBottom: 96 }}>
        <Outlet />
      </div>
      <BarraNavegacion />
    </>
  );
}