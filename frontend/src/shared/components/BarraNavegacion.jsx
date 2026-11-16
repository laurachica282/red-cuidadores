import { NavLink } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import './BarraNavegacion.css';

// Para sumar un botón, agrega una línea a esta lista. `texto` es la clave del diccionario (region/i18n).
const ITEMS = [
  { ruta: '/inicio', texto: 'nav.inicio', icono: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { ruta: '/mascotas', texto: 'nav.mascotas', icono: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z' },
  { ruta: '/reservas', texto: 'nav.reservas', icono: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
  { ruta: '/configuracion', texto: 'nav.cuenta', icono: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0' },
];

export default function BarraNavegacion() {
  const { t } = useIdioma();
  return (
    <nav className="barra-nav" aria-label={t('nav.menu')}>
      {ITEMS.map((item) => (
        <NavLink
          key={item.ruta}
          to={item.ruta}
          className={({ isActive }) => `barra-nav__item${isActive ? ' barra-nav__item--activo' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={item.icono} />
          </svg>
          <span>{t(item.texto)}</span>
        </NavLink>
      ))}
    </nav>
  );
}