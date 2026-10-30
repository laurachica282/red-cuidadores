import { limpiarCodigo } from '../utils/validaciones.js';

// Un solo campo para los 6 dígitos: se puede pegar el código completo y los gestores de
// contraseñas y el teclado del celular lo autocompletan (autoComplete="one-time-code").
export default function CampoCodigo({ id = 'codigo', valor, onChange }) {
  return (
    <div>
      <label className="label" htmlFor={id}>Código de 6 dígitos</label>
      <input id={id} className="input cu-codigo" inputMode="numeric" autoComplete="one-time-code"
        pattern="\d{6}" maxLength={6} placeholder="······" value={valor}
        onChange={(e) => onChange(limpiarCodigo(e.target.value))} required />
    </div>
  );
}
