import { useState } from 'react';
import Aviso from '../components/Aviso.jsx';
import Interruptor from '../components/Interruptor.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { guardarNotificaciones, obtenerNotificaciones } from '../services/cuentaService.js';
import { CANALES, EVENTOS } from '../utils/textos.js';

// HU-32: qué avisos recibe (reservas, reportes, mensajes, promociones) y por qué canal.
function Formulario({ inicial }) {
  const [guardado, setGuardado] = useState(inicial);
  const [borrador, setBorrador] = useState(inicial);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambio = JSON.stringify(guardado) !== JSON.stringify(borrador);

  const marcar = (evento, canal, activo) => {
    setBorrador({ ...borrador, [evento]: { ...borrador[evento], [canal]: activo } });
    setOk('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const { preferencias } = await guardarNotificaciones(borrador);
      setGuardado(preferencias);
      setBorrador(preferencias);
      setOk('Guardamos tus preferencias');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={guardar}>
      <p className="cu-texto">Elige qué avisos quieres recibir y por dónde.</p>
      {EVENTOS.map((ev) => (
        <fieldset key={ev.valor} className="cu-tarjeta" style={{ margin: 0 }}>
          <legend className="cu-sr">{ev.titulo}</legend>
          <h2 aria-hidden="true">{ev.titulo}</h2>
          <p className="cu-item-meta">{ev.desc}</p>
          {CANALES.map((c) => (
            <Interruptor key={c.valor} etiqueta={c.titulo} marcado={!!borrador[ev.valor]?.[c.valor]}
              onChange={(activo) => marcar(ev.valor, c.valor, activo)} />
          ))}
        </fieldset>
      ))}
      <Aviso>{error}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>
      <button type="submit" className="btn-primary" disabled={!cambio || guardando}>
        {guardando ? 'Guardando…' : 'Guardar preferencias'}
      </button>
    </form>
  );
}

export default function NotificacionesPage() {
  const { datos, cargando, error } = useCarga(obtenerNotificaciones);
  return (
    <Pantalla titulo="Notificaciones">
      {cargando && <p className="cu-cargando">Cargando…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Formulario inicial={datos.preferencias} />}
    </Pantalla>
  );
}
