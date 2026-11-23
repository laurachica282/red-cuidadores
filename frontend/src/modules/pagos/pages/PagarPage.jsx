import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerMiPais, pagarReserva, pasarelaDePais, reservaPorId } from '../services/pagosService.js';
import './pagos.css';

const dinero = (v, m) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: m, maximumFractionDigits: 0 }).format(v);

const formatoNumero = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatoVence = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Lo que pide cada método de pago (simulado) y la regla de prueba para ver un rechazo.
const METODOS = {
  tarjeta: { nombre: 'Tarjeta de crédito o débito' },
  paypal: {
    nombre: 'PayPal',
    etiqueta: 'Correo de PayPal',
    placeholder: 'tucorreo@ejemplo.com',
    ayuda: 'Para simular un rechazo, usa un correo que contenga "rechazar".',
  },
  pse: {
    nombre: 'PSE',
    etiqueta: 'Tu banco',
    opciones: [
      ['bancolombia', 'Bancolombia'],
      ['davivienda', 'Davivienda'],
      ['bbva', 'BBVA'],
      ['bogota', 'Banco de Bogotá'],
      ['sin_fondos', 'Banco de prueba (sin fondos)'],
    ],
    ayuda: 'Para simular un rechazo, elige "Banco de prueba (sin fondos)".',
  },
  nequi: {
    nombre: 'Nequi',
    etiqueta: 'Celular de Nequi',
    placeholder: '3101234567',
    digitos: 10,
    ayuda: 'Para simular un rechazo, usa un celular que termine en 0002.',
  },
  spei: {
    nombre: 'SPEI',
    etiqueta: 'CLABE interbancaria (18 dígitos)',
    placeholder: '012345678901234567',
    digitos: 18,
    ayuda: 'Para simular un rechazo, usa una CLABE que termine en 0002.',
  },
  oxxo: {
    nombre: 'OXXO',
    etiqueta: 'Nombre completo',
    placeholder: 'Como aparece en tu identificación',
    ayuda: 'Pago en efectivo simulado: siempre se aprueba.',
  },
  bizum: {
    nombre: 'Bizum',
    etiqueta: 'Móvil de Bizum',
    placeholder: '612345678',
    digitos: 9,
    ayuda: 'Para simular un rechazo, usa un móvil que termine en 0002.',
  },
  pix: {
    nombre: 'Pix',
    etiqueta: 'CPF (11 dígitos)',
    placeholder: '12345678901',
    digitos: 11,
    ayuda: 'Para simular un rechazo, usa un CPF que termine en 0002.',
  },
};

export default function PagarPage() {
  const { id } = useParams();
  const [reserva, setReserva] = useState(null);
  const [metodos, setMetodos] = useState([]); // métodos que ofrece el país del viajero
  const [metodo, setMetodo] = useState('tarjeta');
  const [numero, setNumero] = useState('');
  const [vence, setVence] = useState('');
  const [cvv, setCvv] = useState('');
  const [dato, setDato] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pago, setPago] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [r, mi] = await Promise.all([reservaPorId(id), obtenerMiPais()]);
        const pasarela = await pasarelaDePais(mi.pais);
        if (!vivo) return;
        const lista = (pasarela.metodos ?? ['tarjeta']).filter((m) => METODOS[m]);
        setReserva(r);
        setMetodos(lista);
        setMetodo(lista[0] ?? 'tarjeta');
      } catch (e) {
        if (vivo) setError(e.message);
      }
    })();
    return () => { vivo = false; };
  }, [id]);

  function elegir(m) {
    setMetodo(m);
    setDato('');
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const cuerpo = metodo === 'tarjeta' ? { metodo, numero, vence, cvv } : { metodo, dato };
      setPago(await pagarReserva(id, cuerpo));
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
          Pagaste {dinero(pago.monto, pago.moneda.trim())} con {pago.detalle}.
          El dinero queda retenido y se le entrega al cuidador cuando termine el servicio.
        </p>
        <p className="pg-texto">Referencia: <strong>{pago.referencia}</strong></p>
        <Link className="pg-boton" to="/reservas">Ir a mis reservas</Link>
      </main>
    );
  }

  const moneda = reserva?.moneda?.trim();
  const pagable = reserva?.estado === 'confirmada';
  const m = METODOS[metodo];

  return (
    <main className="pg-pagina">
      <h1 className="pg-titulo">Pagar reserva</h1>
      {error && !pagable && <p className="pg-aviso pg-aviso--error" role="alert">{error}</p>}

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
          <p className="pg-texto"><strong>¿Cómo quieres pagar?</strong></p>
          <div className="pg-metodos" role="group" aria-label="Método de pago">
            {metodos.map((k) => (
              <button key={k} type="button" aria-pressed={metodo === k}
                className={`pg-metodo${metodo === k ? ' pg-metodo--activo' : ''}`} onClick={() => elegir(k)}>
                {METODOS[k].nombre}
              </button>
            ))}
          </div>

          {metodo === 'tarjeta' ? (
            <>
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
              <p className="pg-nota">
                Tarjeta de prueba aprobada: 4242 4242 4242 4242. Rechazada: 4000 0000 0000 0002.
                Usa cualquier fecha futura y cualquier código.
              </p>
            </>
          ) : (
            <>
              <label className="label" htmlFor="dato">{m.etiqueta}</label>
              {m.opciones ? (
                <select id="dato" className="input" value={dato} onChange={(e) => setDato(e.target.value)}>
                  <option value="">Elige un banco</option>
                  {m.opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
              ) : (
                <input id="dato" className="input" autoComplete="off" placeholder={m.placeholder}
                  inputMode={m.digitos ? 'numeric' : undefined} value={dato}
                  onChange={(e) => setDato(m.digitos ? e.target.value.replace(/\D/g, '').slice(0, m.digitos) : e.target.value)} />
              )}
              <p className="pg-nota">{m.ayuda}</p>
            </>
          )}

          {error && <p className="pg-aviso pg-aviso--error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Procesando…' : `Pagar ${dinero(reserva.total, moneda)}`}
          </button>
          <p className="pg-nota">Pago simulado: no se cobra dinero real.</p>
        </form>
      )}
      <Link className="pg-boton pg-boton--claro" to="/reservas">Volver</Link>
    </main>
  );
}