import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificaciones } from '../services/seguimientoService.js';
import { IconCampana } from './Iconos.jsx';
import { DESDE_APP } from '../useVolver.js';
import '../seguimiento.css';

const CADA_MS = 30000;

// Campana del mockup 1: abre las notificaciones y muestra cuántas son nuevas.
export default function Campana() {
  const [nuevas, setNuevas] = useState(0);

  useEffect(() => {
    let vivo = true;
    const traer = () => notificaciones().then((d) => vivo && setNuevas(d.nuevas)).catch(() => {});
    traer();
    const id = setInterval(traer, CADA_MS);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  return (
    <Link to="/notificaciones" state={DESDE_APP} className="sg-campana" aria-label={nuevas ? `Notificaciones: ${nuevas} nuevas` : 'Notificaciones'}>
      <IconCampana width="22" height="22" />
      {nuevas > 0 && <span className="sg-campana-numero">{nuevas > 9 ? '9+' : nuevas}</span>}
    </Link>
  );
}
