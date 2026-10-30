import { Link } from 'react-router-dom';
import { IconAtras } from './Iconos.jsx';
import '../cuenta.css';
import { RUTAS } from '../rutas.js';

// Marco común de las pantallas del módulo: cabecera con "volver" y contenido.
// En celular ocupa todo el ancho; en computador se ve como tarjeta centrada, igual que el login.
export default function Pantalla({ titulo, atras = RUTAS.configuracion, etiquetaAtras = 'Volver', children }) {
  return (
    <div className="cu-fondo">
      <main className="cu">
        <header className="cu-cabecera">
          <Link className="cu-atras" to={atras} aria-label={etiquetaAtras}><IconAtras /></Link>
          <h1>{titulo}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
