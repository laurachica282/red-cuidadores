// Interruptor accesible (checkbox con role="switch"). Se activa con clic, toque o la barra espaciadora.
export default function Interruptor({ etiqueta, marcado, onChange, disabled }) {
  return (
    <label className="cu-interruptor">
      <span>{etiqueta}</span>
      <input type="checkbox" role="switch" checked={marcado} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span className="cu-interruptor-pista" aria-hidden="true" />
    </label>
  );
}
