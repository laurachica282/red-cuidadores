import { Link } from 'react-router-dom';
import { useIdioma } from '../i18n/i18n.js';
import '../region.css';

const Flecha = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

// Marco de las pantallas según los mockups: botón redondo de volver + título, y botón fijo abajo (pie).
export default function Pantalla({ titulo, sub, atras, pie, children }) {
  const { t } = useIdioma();
  return (
    <div className="rg-fondo">
      <main className="rg">
        <header className="rg-cab">
          {atras && <Link className="rg-atras" to={atras} aria-label={t('comun.volver')}><Flecha /></Link>}
          <h1>{titulo}</h1>
        </header>
        <div className="rg-cuerpo">
          {sub && <p className="rg-sub">{sub}</p>}
          {children}
        </div>
        {pie && <div className="rg-pie">{pie}</div>}
      </main>
    </div>
  );
}
