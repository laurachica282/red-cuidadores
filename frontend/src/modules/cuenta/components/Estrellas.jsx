import { useIdioma } from '@/modules/region';
import '../i18n.js';
import { IconEstrella } from './Iconos.jsx';
import { NOMBRES_CALIFICACION as NOMBRES } from '../utils/textos.js';

const NIVELES = [1, 2, 3, 4, 5];

// Calificación de 1 a 5. Editable es un grupo de opciones (se maneja con flechas y Tab);
// de solo lectura se anuncia como "4 de 5 estrellas".
export default function Estrellas({ valor, onChange, tamano = 36 }) {
  const { t } = useIdioma();
  if (!onChange) {
    return (
      <span className="cu-estrellas" role="img" aria-label={t('cuenta.estrellas.lectura', { n: valor })}>
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
    <div className="cu-estrellas" role="radiogroup" aria-label={t('cuenta.estrellas.grupo')}>
      {NIVELES.map((n) => (
        <button key={n} type="button" role="radio" data-n={n}
          aria-checked={valor === n} aria-label={t(n === 1 ? 'cuenta.estrellas.una' : 'cuenta.estrellas.varias', { n, nombre: t(NOMBRES[n - 1]) })}
          tabIndex={valor === n || (!valor && n === 1) ? 0 : -1}
          className={`cu-estrella ${n <= valor ? 'cu-estrella-on' : ''}`}
          onClick={() => onChange(n)} onKeyDown={(e) => mover(e, n)}>
          <IconEstrella llena={n <= valor} width={tamano} height={tamano} />
        </button>
      ))}
    </div>
  );
}
