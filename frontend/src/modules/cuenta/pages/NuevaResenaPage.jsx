import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { traducirMensajeServidor } from '@/shared/api/mensajesServidor.js';
import '../i18n.js';
import Aviso from '../components/Aviso.jsx';
import Estrellas from '../components/Estrellas.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { crearResena, estadoDeReserva } from '../services/cuentaService.js';
import { NOMBRES_CALIFICACION } from '../utils/textos.js';
import { RUTAS } from '../rutas.js';

const MAX = 1000;

// HU-33: de 1 a 5 estrellas con comentario, solo si la reserva se completó.
function Formulario({ estado, reservaId, alTerminar }) {
  const { t } = useIdioma();
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!calificacion) return setError(t('cuenta.resena.elegir'));
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
        <p className="label">{t('cuenta.resena.comoFue', { nombre: estado.cuidador?.nombre })}</p>
        <Estrellas valor={calificacion} onChange={(n) => { setCalificacion(n); setError(''); }} />
        <p className="cu-ayuda" aria-live="polite">{calificacion ? t(NOMBRES_CALIFICACION[calificacion - 1]) : t('cuenta.resena.tocaEstrella')}</p>
      </div>

      <div>
        <label className="label" htmlFor="comentario">{t('cuenta.resena.comentario')}</label>
        <textarea id="comentario" className="input" maxLength={MAX} placeholder={t('cuenta.resena.comentarioPh')}
          value={comentario} onChange={(e) => setComentario(e.target.value)} />
        <p className="cu-ayuda">{comentario.length}/{MAX}</p>
      </div>

      <Aviso>{error}</Aviso>
      <button type="submit" className="btn-primary" disabled={enviando}>
        {enviando ? t('cuenta.enviando') : t('cuenta.resena.publicar')}
      </button>
    </form>
  );
}

export default function NuevaResenaPage() {
  const { t } = useIdioma();
  const { reservaId } = useParams();
  const { datos: estado, cargando, error } = useCarga(() => estadoDeReserva(reservaId), reservaId);
  const [publicada, setPublicada] = useState(false);

  return (
    <Pantalla titulo={t('cuenta.resena.titulo')}>
      {cargando && <p className="cu-cargando">{t('cuenta.cargando')}</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}

      {publicada && (
        <>
          <Aviso tipo="ok">{t('cuenta.resena.gracias')}</Aviso>
          <Link className="btn-primary" to={RUTAS.resenas}>{t('cuenta.resena.verMis')}</Link>
        </>
      )}

      {estado && !publicada && (estado.puede_calificar
        ? <Formulario estado={estado} reservaId={reservaId} alTerminar={() => setPublicada(true)} />
        : (
          <>
            <Aviso tipo="info">{traducirMensajeServidor(estado.motivo)}</Aviso>
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
