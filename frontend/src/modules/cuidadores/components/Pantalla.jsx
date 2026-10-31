import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { IconFlecha } from './Iconos.jsx';
import '../cuidadores.css';

// Marco de las pantallas según los mockups: botón redondo de volver + título, y botón fijo abajo (pie).
export default function Pantalla({ titulo, sub, atras, pie, children }) {
  const { t } = useIdioma();
  return (
    <div className="cd-fondo">
      <main className="cd">
        <header className="cd-cab">
          {atras && <Link className="cd-atras" to={atras} aria-label={t('comun.volver')}><IconFlecha /></Link>}
          <h1>{titulo}</h1>
        </header>
        <div className="cd-cuerpo">
          {sub && <p className="cd-sub">{sub}</p>}
          {children}
        </div>
        {pie && <div className="cd-pie">{pie}</div>}
      </main>
    </div>
  );
}
