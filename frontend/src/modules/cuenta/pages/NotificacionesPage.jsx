import { useState } from 'react';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import Aviso from '../components/Aviso.jsx';
import Casilla from '../components/Casilla.jsx';
import Interruptor from '../components/Interruptor.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { guardarNotificaciones, obtenerNotificaciones } from '../services/cuentaService.js';
import { CANALES, EVENTOS } from '../utils/textos.js';

// HU-32 (mockup 16): "Qué te avisamos" (eventos) y "Por dónde" (canales). Se avisa de un evento
// solo si está activo, y por los canales activos.
function Formulario({ inicial }) {
  const { t } = useIdioma();
  const [guardado, setGuardado] = useState(inicial);
  const [borrador, setBorrador] = useState(inicial);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambio = JSON.stringify(guardado) !== JSON.stringify(borrador);

  const marcar = (grupo, clave, activo) => {
    setBorrador({ ...borrador, [grupo]: { ...borrador[grupo], [clave]: activo } });
    setOk('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const nuevo = await guardarNotificaciones(borrador);
      setGuardado(nuevo);
      setBorrador(nuevo);
      setOk(t('cuenta.notif.guardadas'));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={guardar}>
      <p className="cu-texto">{t('cuenta.notif.elige')}</p>

      <p className="cu-seccion">{t('cuenta.notif.queAvisamos')}</p>
      <div className="cu-filas">
        {EVENTOS.map((ev) => (
          <div key={ev.valor}>
            <Interruptor titulo={t(ev.titulo)} descripcion={t(ev.desc)} marcado={!!borrador.eventos[ev.valor]}
              onChange={(activo) => marcar('eventos', ev.valor, activo)} />
          </div>
        ))}
      </div>

      <p className="cu-seccion">{t('cuenta.notif.porDonde')}</p>
      <div className="cu-filas">
        {CANALES.map((c) => (
          <div key={c.valor}>
            <Casilla titulo={t(c.titulo)} marcado={!!borrador.canales[c.valor]}
              onChange={(activo) => marcar('canales', c.valor, activo)} />
          </div>
        ))}
      </div>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <Aviso tipo="ok">{ok}</Aviso>
        <button type="submit" className="btn-primary" disabled={!cambio || guardando}>
          {guardando ? t('cuenta.guardando') : t('cuenta.notif.guardar')}
        </button>
      </div>
    </form>
  );
}

export default function NotificacionesPage() {
  const { t } = useIdioma();
  const { datos, cargando, error } = useCarga(obtenerNotificaciones);
  return (
    <Pantalla titulo={t('cuenta.menu.notificaciones')}>
      {cargando && <p className="cu-cargando">{t('cuenta.cargando')}</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Formulario inicial={datos} />}
    </Pantalla>
  );
}
