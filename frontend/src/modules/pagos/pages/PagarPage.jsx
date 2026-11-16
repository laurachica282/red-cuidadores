import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pagarReserva, reservaPorId } from '../services/pagosService.js';
import './pagos.css';

const dinero = (v, m) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: m, maximumFractionDigits: 0 }).format(v);

const formatoNumero = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatoVence = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function PagarPage() {
  const { id } = useParams();
  const [reserva, setReserva] = useState(null);
  const [numero, setNumero] = useState('');
  const [vence, setVence] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pago, setPago] = useState(null);

  useEffect(() => {
    reservaPorId(id).then(setReserva).catch((e) => setError(e.message));
  }, [id]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      setPago(await pagarReserva(id, { numero, vence, cvv }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (pago) {
    return (
      <main className="pg-pagina">
        <h1 className="pg-titulo">¡Pago recibido!</h1>
        <p className="pg-aviso pg-aviso--ok">
          Pagaste {dinero(pago.monto, pago.moneda.trim())} con la tarjeta que termina en {pago.tarjeta_ultimos4}.
          El dinero queda retenido y se le entrega al cuidador cuando termine el servicio.
        </p>
        <p className="pg-texto">Referencia: <strong>{pago.referencia}</strong></p>
        <Link className="pg-boton" to="/reservas">Ir a mis reservas</Link>
      </main>
    );
  }

  const moneda = reserva?.moneda?.trim();
  const pagable = reserva?.estado === 'confirmada';

  return (
    <main className="pg-pagina">
      <h1 className="pg-titulo">Pagar reserva</h1>
      {error && <p className="pg-aviso pg-aviso--error" role="alert">{error}</p>}

      {reserva && (
        <div className="pg-tarjeta">
          <p className="pg-texto"><strong>{reserva.cuidador}</strong> cuidará a <strong>{reserva.mascota}</strong></p>
          <p className="pg-texto">{reserva.fecha_inicio} → {reserva.fecha_fin}</p>
          <p className="pg-valor">{dinero(reserva.total, moneda)}</p>
        </div>
      )}

      {reserva && !pagable && (
        <p className="pg-aviso pg-aviso--error">Esta reserva no se puede pagar ahora (estado: {reserva.estado}).</p>
      )}

      {pagable && (
        <form className="pg-form" onSubmit={enviar}>
          <label className="label" htmlFor="numero">Número de tarjeta</label>
          <input id="numero" className="input" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242"
            value={numero} onChange={(e) => setNumero(formatoNumero(e.target.value))} />
          <div className="pg-fila">
            <div>
              <label className="label" htmlFor="vence">Vence</label>
              <input id="vence" className="input" inputMode="numeric" autoComplete="off" placeholder="MM/AA"
                value={vence} onChange={(e) => setVence(formatoVence(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="cvv">Código</label>
              <input id="cvv" className="input" inputMode="numeric" autoComplete="off" placeholder="123" maxLength={4}
                value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Procesando…' : `Pagar ${dinero(reserva.total, moneda)}`}
          </button>
          <p className="pg-nota">
            Pago simulado, no se cobra dinero real. Tarjeta de prueba aprobada: 4242 4242 4242 4242. Rechazada: 4000 0000 0000 0002.
            Usa cualquier fecha futura y cualquier código.
          </p>
        </form>
      )}
      <Link className="pg-boton pg-boton--claro" to="/reservas">Volver</Link>
    </main>
  );
}