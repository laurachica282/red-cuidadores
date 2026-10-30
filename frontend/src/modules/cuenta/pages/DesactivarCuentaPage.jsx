import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import Aviso from '../components/Aviso.jsx';
import CampoClave from '../components/CampoClave.jsx';
import { IconAlerta, IconCheck } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { desactivarCuenta, obtenerPendientes } from '../services/cuentaService.js';
import { MOTIVOS, PAZ_Y_SALVO } from '../utils/textos.js';

// Mockup 18 (antes "Eliminar cuenta"; ahora "Desactivar cuenta" por RN-5: nada se borra).
// HU-37: "Antes de irte" muestra qué falta para cerrar. HU-39: desactiva con motivo y contraseña.
function Formulario({ alTerminar }) {
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [clave, setClave] = useState('');
  const [entiendo, setEntiendo] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const completo = motivo && clave && entiendo;

  const enviar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setError('');
    setEnviando(true);
    try {
      await desactivarCuenta({ clave, motivo, detalle: motivo === 'otro' ? detalle : '' });
      alTerminar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={enviar}>
      <div>
        <label className="label" htmlFor="motivo">¿Por qué te vas?</label>
        <select id="motivo" name="motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          <option value="">Elige un motivo</option>
          {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.titulo}</option>)}
        </select>
      </div>

      {motivo === 'otro' && (
        <div>
          <label className="label" htmlFor="detalle">Cuéntanos más (opcional)</label>
          <textarea id="detalle" className="input" maxLength={500} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        </div>
      )}

      <CampoClave id="clave" etiqueta="Escribe tu contraseña para confirmar" placeholder="Tu contraseña" valor={clave} onChange={setClave} />

      <label className="cu-check">
        <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
        Entiendo que mi perfil dejará de ser visible y que se cerrarán mis sesiones. Mis datos se conservan.
      </label>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <button type="submit" className="cu-btn cu-btn-peligro" disabled={!completo || enviando}>
          {enviando ? 'Desactivando…' : 'Desactivar mi cuenta'}
        </button>
        <Link className="cu-btn" to="/cuenta">Mejor me quedo</Link>
      </div>
    </form>
  );
}

export default function DesactivarCuentaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { datos, cargando, error } = useCarga(obtenerPendientes);

  // Se navega a la pantalla pública SIN cerrar la sesión aquí: si se cerrara antes, la ruta
  // protegida redirigiría a /login y ganaría a esta navegación. La sesión local se cierra al
  // llegar a /reactivar (ReactivarCuentaPage mira state.desactivada).
  const terminar = () => {
    navigate('/reactivar', { state: { correo: usuario.correo, desactivada: true }, replace: true });
  };

  return (
    <Pantalla titulo="Desactivar cuenta">
      <div className="cu-peligro">
        <IconAlerta />
        <div>
          <strong>Tu perfil dejará de ser visible</strong>
          No borramos nada: tus datos, reservas y reseñas se conservan. Puedes reactivar tu cuenta cuando quieras con un código por correo.
        </div>
      </div>

      {cargando && <p className="cu-cargando">Revisando que estés a paz y salvo…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}

      {datos && (
        <>
          <p className="cu-titulo-lista">Antes de irte</p>
          <ul className="cu-chequeo">
            {datos.verificaciones.map((v) => {
              const textos = PAZ_Y_SALVO[v.codigo];
              const pendiente = v.cantidad > 0;
              return (
                <li key={v.codigo} className={pendiente ? 'cu-pendiente-item' : ''}>
                  {pendiente ? <IconAlerta /> : <IconCheck />}
                  <span>
                    {pendiente ? textos.pendiente(v.cantidad) : textos.ok}
                    {v.detalle && <small>{v.detalle}</small>}
                  </span>
                </li>
              );
            })}
          </ul>

          {datos.puede_cerrar
            ? <Formulario alTerminar={terminar} />
            : (
              <div className="cu-form">
                <Aviso tipo="info">Para desactivar tu cuenta debes estar a paz y salvo. Resuelve lo pendiente y vuelve a intentarlo.</Aviso>
                <div className="cu-acciones"><Link className="cu-btn" to="/cuenta">Mejor me quedo</Link></div>
              </div>
            )}
        </>
      )}
    </Pantalla>
  );
}
