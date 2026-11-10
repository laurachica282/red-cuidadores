import { useCallback, useState } from 'react';
import { detalle } from '../services/seguimientoService.js';
import HojaEmergencia from './HojaEmergencia.jsx';
import { IconAlerta } from './Iconos.jsx';
import '../seguimiento.css';

// HU-28: botón de emergencia para poner en cada reserva en curso (lo usa la lista de reservas).
// Carga el contacto y el veterinario solo al tocarlo.
export default function BotonEmergencia({ reservaId, className = '' }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const cerrar = useCallback(() => setDatos(null), []);

  async function abrir() {
    setError('');
    setCargando(true);
    try {
      setDatos(await detalle(reservaId));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button type="button" className={`sg-boton-emergencia ${className}`} onClick={abrir} disabled={cargando}>
        <IconAlerta width="18" height="18" /> {cargando ? 'Abriendo…' : 'Emergencia'}
      </button>
      {error && <p className="sg-error" role="alert">{error}</p>}
      {datos && (
        <HojaEmergencia reservaId={reservaId} mascota={datos.reserva.mascota.nombre} emergencia={datos.emergencia}
          onCerrar={cerrar} onAlerta={() => {}} />
      )}
    </>
  );
}
