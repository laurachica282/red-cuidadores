// Fila con interruptor (role="switch") para "Qué te avisamos" (mockup 16).
// Todo el renglón es el área de toque; funciona con clic, toque o la barra espaciadora.
export default function Interruptor({ titulo, descripcion, marcado, onChange, disabled }) {
  return (
    <label className="cu-fila-item">
      <span>
        <span className="cu-fila-titulo">{titulo}</span>
        {descripcion && <span className="cu-fila-desc">{descripcion}</span>}
      </span>
      <input type="checkbox" role="switch" checked={marcado} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span className="cu-pista" aria-hidden="true" />
    </label>
  );
}
