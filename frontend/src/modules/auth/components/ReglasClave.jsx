import { REGLAS } from './reglasClave.js';
import './ReglasClave.css';

// `extras` suma reglas ya evaluadas: [{ id, texto, ok }] (p. ej. que las dos contraseñas coincidan).
export default function ReglasClave({ clave, extras = [] }) {
  const reglas = [
    ...REGLAS.map((r) => ({ id: r.id, texto: r.texto, ok: r.cumple(clave) })),
    ...extras,
  ];
  return (
    <ul className="reglas-clave" aria-label="Requisitos de la contraseña">
      {reglas.map((r) => {
        const ok = r.ok;
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
