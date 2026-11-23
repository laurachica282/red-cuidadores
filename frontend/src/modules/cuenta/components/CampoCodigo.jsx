import { useIdioma } from '@/modules/region';
import '../i18n.js';
import { limpiarCodigo } from '../utils/validaciones.js';

// Código de 6 dígitos en 6 casillas (mockup 9). Detrás hay UN solo campo de texto: se puede pegar
// el código completo y el teclado del celular o el gestor de contraseñas lo autocompletan.
export default function CampoCodigo({ id = 'codigo', valor, onChange }) {
  const { t } = useIdioma();
  return (
    <div className="cu-codigo-caja">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} aria-hidden="true"
          className={`cu-celda ${i === Math.min(valor.length, 5) ? 'cu-celda-activa' : ''}`}>
          {valor[i] ?? ''}
        </span>
      ))}
      <input id={id} className="cu-codigo-entrada" aria-label={t('cuenta.codigo.aria')} inputMode="numeric"
        autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={valor} autoFocus
        onChange={(e) => onChange(limpiarCodigo(e.target.value))} required />
    </div>
  );
}
