import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Aviso from '../components/Aviso.jsx';
import Estrellas from '../components/Estrellas.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { crearResena, estadoDeReserva } from '../services/cuentaService.js';
import { NOMBRES_CALIFICACION } from '../utils/textos.js';

const MAX = 1000;

// HU-33: de 1 a 5 estrellas con comentario, solo si la reserva se completó.
function Formulario({ estado, reservaId, alTerminar }) {
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!calificacion) return setError('Elige de 1 a 5 estrellas');
    setError('');
    setEnviando(true);
    try {
      await crearResena({ reserva_id: Number(reservaId), calificacion, comentario });
      alTerminar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={enviar} noValidate>
      <div>
        <p className="label">¿Cómo fue el servicio de {estado.cuidador?.nombre}?</p>
        <Estrellas valor={calificacion} onChange={(n) => { setCalificacion(n); setError(''); }} />
        <p className="cu-ayuda" aria-live="polite">{calificacion ? NOMBRES_CALIFICACION[calificacion - 1] : 'Toca una estrella'}</p>
      </div>

      <div>
        <label className="label" htmlFor="comentario">Comentario (opcional)</label>
        <textarea id="comentario" className="input" maxLength={MAX} placeholder="Cuéntale a otros viajeros cómo le fue a tu mascota"
          value={comentario} onChange={(e) => setComentario(e.target.value)} />
        <p className="cu-ayuda">{comentario.length}/{MAX}</p>
      </div>

      <Aviso>{error}</Aviso>
      <button type="submit" className="btn-primary" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Publicar reseña'}
      </button>
    </form>
  );
}

export default function NuevaResenaPage() {
  const { reservaId } = useParams();
  const { datos: estado, cargando, error } = useCarga(() => estadoDeReserva(reservaId), reservaId);
  const [publicada, setPublicada] = useState(false);

  return (
    <Pantalla titulo="Calificar cuidador">
      {cargando && <p className="cu-cargando">Cargando…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}

      {publicada && (
        <>
          <Aviso tipo="ok">¡Gracias! Tu reseña ayuda a otros viajeros.</Aviso>
          <Link className="btn-primary" to="/cuenta/resenas">Ver mis reseñas</Link>
        </>
      )}

      {estado && !publicada && (estado.puede_calificar
        ? <Formulario estado={estado} reservaId={reservaId} alTerminar={() => setPublicada(true)} />
        : (
          <>
            <Aviso tipo="info">{estado.motivo}</Aviso>
            {estado.resena && (
              <div className="cu-item">
                <Estrellas valor={estado.resena.calificacion} tamano={20} />
                {estado.resena.comentario && <p className="cu-item-texto">{estado.resena.comentario}</p>}
              </div>
            )}
          </>
        ))}
    </Pantalla>
  );
}
