import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconAtras, IconEnviar } from '../components/Iconos.jsx';
import { detalle, enviarMensaje, leerMensajes } from '../services/seguimientoService.js';
import { diaCorto, hora, primerNombre } from '../utils.js';
import { useVolver } from '../useVolver.js';
import '../seguimiento.css';

const CADA_MS = 4000;

// HU-31: chat de la reserva. "Casi en tiempo real": pregunta por mensajes nuevos cada 4 segundos.
export default function ChatPage() {
  const { id } = useParams();
  const volver = useVolver(`/reservas/${id}/seguimiento`);
  const [reserva, setReserva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [chat, setChat] = useState({ abierto: true, cierraEl: null });
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const ultimo = useRef(0);
  const fondo = useRef(null);

  useEffect(() => {
    detalle(id).then((d) => setReserva(d.reserva)).catch((e) => setError(e.message));
  }, [id]);

  // Trae solo los mensajes nuevos (después del último que ya se tiene).
  useEffect(() => {
    let vivo = true;
    const traer = () =>
      leerMensajes(id, ultimo.current)
        .then((r) => {
          if (!vivo) return;
          setChat({ abierto: r.abierto, cierraEl: r.cierraEl });
          if (r.mensajes.length) {
            ultimo.current = r.mensajes.at(-1).id;
            setMensajes((m) => [...m, ...r.mensajes.filter((x) => !m.some((y) => y.id === x.id))]);
          }
        })
        .catch((e) => vivo && setError(e.message));
    traer();
    const intervalo = setInterval(traer, CADA_MS);
    return () => { vivo = false; clearInterval(intervalo); };
  }, [id]);

  useEffect(() => { fondo.current?.scrollIntoView({ block: 'end' }); }, [mensajes.length]);

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    setError('');
    try {
      const m = await enviarMensaje(id, t);
      ultimo.current = Math.max(Number(ultimo.current), Number(m.id));
      setMensajes((lista) => [...lista, m]);
      setTexto('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const otro = reserva ? (reserva.soy === 'viajero' ? reserva.cuidador.nombre : reserva.viajero.nombre) : '';

  return (
    <main className="sg-chat">
      <div className="sg-encabezado sg-encabezado--chat">
        <button type="button" className="sg-redondo" aria-label="Volver" onClick={volver}><IconAtras /></button>
        <div>
          <h1>{otro || 'Chat'}</h1>
          {reserva && <small>{reserva.mascota.nombre} · Reserva #{reserva.id}</small>}
        </div>
      </div>

      <div className="sg-mensajes" aria-live="polite">
        {mensajes.length === 0 && <p className="sg-vacio">Aún no hay mensajes. Saluda a {primerNombre(otro) || 'la otra persona'}.</p>}
        {mensajes.map((m, i) => {
          const dia = diaCorto(m.creadoEn);
          const nuevoDia = i === 0 || diaCorto(mensajes[i - 1].creadoEn) !== dia;
          return (
            <div key={m.id}>
              {nuevoDia && <p className="sg-separador">{dia}</p>}
              <div className={`sg-burbuja${m.mio ? ' sg-burbuja--mia' : ''}`}>
                <p>{m.texto}</p>
                <small>{hora(m.creadoEn)}{m.mio && m.leido ? ' · Leído' : ''}</small>
              </div>
            </div>
          );
        })}
        <div ref={fondo} />
      </div>

      {error && <p className="sg-error sg-chat-error" role="alert">{error}</p>}
      {chat.abierto ? (
        <form className="sg-escribir" onSubmit={enviar}>
          <input className="input" placeholder="Escribe un mensaje" maxLength={1000} value={texto}
            onChange={(e) => setTexto(e.target.value)} aria-label="Mensaje" />
          <button type="submit" className="sg-enviar" aria-label="Enviar" disabled={enviando || !texto.trim()}><IconEnviar /></button>
        </form>
      ) : (
        <p className="sg-chat-cerrado">
          El chat se cerró el {chat.cierraEl ? diaCorto(chat.cierraEl) : ''}, 7 días después del servicio. El historial queda como evidencia.
        </p>
      )}
    </main>
  );
}
