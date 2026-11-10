import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth';
import {
  cancelarReserva, confirmarReserva, rechazarReserva, reservasMias, reservasRecibidas,
} from '../services/reservasService.js';
import { ESTADOS, SERVICIOS, fechaCorta, fechaHora, precio } from '../utils.js';
import './reservas.css';

export default function MisReservasPage() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const esCuidador = rol === 'cuidador';
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    if (rol === 'admin') {
      setCargando(false);
      return;
    }
    try {
      setReservas(await (esCuidador ? reservasRecibidas() : reservasMias()));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [rol, esCuidador]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function ejecutar(accion) {
    setError('');
    try {
      await accion();
      setRechazando(null);
      setMotivo('');
    } catch (e) {
      setError(e.message);
    }
    await cargar();
  }

  if (rol === 'admin') {
    return <main className="rs-pagina"><p className="rs-texto">Las reservas son para viajeros y cuidadores.</p></main>;
  }

  return (
    <main className="rs-pagina">
      <h1 className="rs-titulo">{esCuidador ? 'Solicitudes recibidas' : 'Mis reservas'}</h1>
      {error && <p className="rs-aviso rs-aviso--error" role="alert">{error}</p>}
      {cargando && <p className="rs-texto">Cargando…</p>}
      {!cargando && reservas.length === 0 && <p className="rs-texto">Todavía no hay reservas.</p>}

      <ul className="rs-lista">
        {reservas.map((r) => (
          <li key={r.id} className="rs-tarjeta">
            <div className="rs-cabecera">
              <strong>{SERVICIOS[r.servicio]?.texto ?? r.servicio}</strong>
              <span className={`rs-estado rs-estado--${r.estado}`}>{ESTADOS[r.estado] ?? r.estado}</span>
            </div>
            <p className="rs-texto">
              {esCuidador ? `Viajero: ${r.viajero}` : `Cuidador: ${r.cuidador}`} · Mascota: {r.mascota}
            </p>
            <p className="rs-texto">
              {fechaCorta(r.fecha_inicio)} – {fechaCorta(r.fecha_fin)} · <strong>{precio(r.total, r.moneda.trim())}</strong>
            </p>
            {r.nota && <p className="rs-texto">“{r.nota}”</p>}
            {r.estado === 'pendiente' && (
              <p className="rs-texto">Responder antes del {fechaHora(r.responder_antes)}</p>
            )}
            {r.estado === 'rechazada' && r.motivo_rechazo && <p className="rs-texto">Motivo: {r.motivo_rechazo}</p>}

            {r.estado === 'pendiente' && esCuidador && (
              <div className="rs-acciones">
                <button type="button" className="btn-primary" onClick={() => ejecutar(() => confirmarReserva(r.id))}>
                  Confirmar
                </button>
                {rechazando === r.id ? (
                  <>
                    <label className="label" htmlFor={`motivo-${r.id}`}>Motivo del rechazo</label>
                    <input id={`motivo-${r.id}`} className="input" value={motivo} maxLength={300}
                      onChange={(e) => setMotivo(e.target.value)} />
                    <button type="button" className="rs-boton-claro" onClick={() => ejecutar(() => rechazarReserva(r.id, motivo))}>
                      Enviar rechazo
                    </button>
                  </>
                ) : (
                  <button type="button" className="rs-boton-claro" onClick={() => setRechazando(r.id)}>Rechazar</button>
                )}
              </div>
            )}
            {r.estado === 'pendiente' && !esCuidador && (
              <div className="rs-acciones">
                <button type="button" className="rs-boton-claro" onClick={() => ejecutar(() => cancelarReserva(r.id))}>
                  Cancelar solicitud
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}