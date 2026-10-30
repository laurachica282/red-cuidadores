import { IconEstrella } from './Iconos.jsx';

import { NOMBRES_CALIFICACION as NOMBRES } from '../utils/textos.js';

const NIVELES = [1, 2, 3, 4, 5];

// Calificación de 1 a 5. Editable es un grupo de opciones (se maneja con flechas y Tab);
// de solo lectura se anuncia como "4 de 5 estrellas".
export default function Estrellas({ valor, onChange, tamano = 36 }) {
  if (!onChange) {
    return (
      <span className="cu-estrellas" role="img" aria-label={`${valor} de 5 estrellas`}>
        {NIVELES.map((n) => <IconEstrella key={n} llena={n <= valor} width={tamano} height={tamano} />)}
      </span>
    );
  }

  const mover = (e, n) => {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const siguiente = Math.min(5, Math.max(1, n + delta));
    onChange(siguiente);
    e.currentTarget.parentElement.querySelector(`[data-n="${siguiente}"]`)?.focus();
  };

  return (
    <div className="cu-estrellas" role="radiogroup" aria-label="Calificación">
      {NIVELES.map((n) => (
        <button key={n} type="button" role="radio" data-n={n}
          aria-checked={valor === n} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${NOMBRES[n - 1]}`}
          tabIndex={valor === n || (!valor && n === 1) ? 0 : -1}
          className={`cu-estrella ${n <= valor ? 'cu-estrella-on' : ''}`}
          onClick={() => onChange(n)} onKeyDown={(e) => mover(e, n)}>
          <IconEstrella llena={n <= valor} width={tamano} height={tamano} />
        </button>
      ))}
    </div>
  );
}
