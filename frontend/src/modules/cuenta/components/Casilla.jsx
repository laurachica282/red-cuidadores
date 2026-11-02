import { IconCheck } from './Iconos.jsx';

// Fila con casilla para "Por dónde" (mockup 16).
export default function Casilla({ titulo, marcado, onChange }) {
  return (
    <label className="cu-fila-item cu-fila-casilla">
      <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} />
      <span className="cu-caja" aria-hidden="true"><IconCheck /></span>
      <span className="cu-fila-titulo" style={{ fontWeight: 500 }}>{titulo}</span>
    </label>
  );
}
