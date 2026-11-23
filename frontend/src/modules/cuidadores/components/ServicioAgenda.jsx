import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { nombreServicio } from '@/modules/reservas';
import { IconChat } from './Iconos.jsx';

// Los botones "atrás" del seguimiento y del chat regresan aquí solo si el enlace avisa que viene de la app.
const DESDE_APP = { desde: 'app' };
const primerNombre = (nombre = '') => nombre.split(' ')[0];

// Un servicio de la agenda en una fila: cuándo (día y hora), qué y con quién, y el chat a un toque.
// Tocar la fila abre el seguimiento de la reserva.
export default function ServicioAgenda({ s, momento, dia }) {
  const { t } = useIdioma();
  const r = s.reserva;
  const terminado = s.estado === 'completada';
  const hora = r?.hora_inicio ? r.hora_inicio.slice(0, 5) : t(`agenda.momento.${momento}`);
  const hasta = r?.hora_fin ? r.hora_fin.slice(0, 5) : null;

  return (
    <div className={`tb-servicio${s.estado === 'en_curso' ? ' tb-servicio--activo' : ''}${terminado ? ' tb-servicio--pasado' : ''}`}>
      <Link to={`/reservas/${s.id}/seguimiento`} state={DESDE_APP} className="tb-servicio-enlace">
        <span className="tb-servicio-cuando">
          {dia && <small>{dia}</small>}
          <strong>{hora}</strong>
          {hasta && <small>{hasta}</small>}
        </span>
        <span className="tb-servicio-cuerpo">
          <strong>{nombreServicio(s.servicio)} · {s.mascota?.nombre}</strong>
          <span>{t('agenda.de', { viajero: primerNombre(s.viajero?.nombre) })}</span>
        </span>
      </Link>
      {!terminado && (
        <Link to={`/reservas/${s.id}/chat`} state={DESDE_APP} className="tb-servicio-chat" aria-label={t('tablero.chat')}>
          <IconChat />
          {s.resumen?.sinLeer > 0 && <span className="tb-insignia">{s.resumen.sinLeer}</span>}
        </Link>
      )}
    </div>
  );
}
