import { REGLAS } from './reglasClave.js';
import './ReglasClave.css';

export default function ReglasClave({ clave }) {
  return (
    <ul className="reglas-clave" aria-label="Requisitos de la contraseña">
      {REGLAS.map((r) => {
        const ok = r.cumple(clave);
        return (
          <li key={r.id} className={ok ? 'reglas-clave-ok' : ''}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span>
            {r.texto}
            <span className="reglas-clave-estado">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
