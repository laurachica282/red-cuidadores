import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import Aviso from '../components/Aviso.jsx';
import CampoClave from '../components/CampoClave.jsx';
import { IconAlerta, IconEscudo } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { desactivarCuenta, obtenerPendientes } from '../services/cuentaService.js';
import { MOTIVOS } from '../utils/textos.js';

// HU-37 (ver pendientes) y HU-39 (desactivar). Nada se borra: la cuenta queda con status = false.
function Formulario({ usuario, alTerminar }) {
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
      await desactivarCuenta({ clave, motivo, detalle });
      alTerminar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={enviar}>
      <fieldset className="cu-opciones">
        <legend>¿Por qué te vas?</legend>
        {MOTIVOS.map((m) => (
          <label key={m.valor} className="cu-radio">
            <input type="radio" name="motivo" value={m.valor} checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} />
            {m.titulo}
          </label>
        ))}
      </fieldset>

      <div>
        <label className="label" htmlFor="detalle">Cuéntanos más (opcional)</label>
        <textarea id="detalle" className="input" maxLength={500} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
      </div>

      <CampoClave id="clave" etiqueta="Confirma con tu contraseña" valor={clave} onChange={setClave} />

      <label className="cu-check">
        <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
        Entiendo que mi perfil dejará de ser visible y que cerraré mis sesiones. Puedo reactivar la cuenta cuando quiera.
      </label>

      <Aviso>{error}</Aviso>
      <button type="submit" className="cu-btn cu-btn-peligro" disabled={!completo || enviando}>
        {enviando ? 'Desactivando…' : 'Desactivar cuenta'}
      </button>
      <p className="cu-texto" style={{ textAlign: 'center' }}>Cuenta de {usuario.correo}</p>
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
      <div className="cu-tarjeta cu-tarjeta-suave">
        <h2><IconEscudo style={{ verticalAlign: '-4px' }} /> No borramos nada</h2>
        <p className="cu-texto">
          Desactivar la cuenta oculta tu perfil y cierra tus sesiones, pero tus datos, reservas y reseñas se conservan.
          Puedes volver cuando quieras con un código que te enviamos por correo.
        </p>
      </div>

      {cargando && <p className="cu-cargando">Revisando que estés a paz y salvo…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}

      {datos && !datos.puede_cerrar && (
        <>
          <Aviso tipo="info">Para desactivar tu cuenta debes estar a paz y salvo. Esto es lo que falta:</Aviso>
          <ul className="cu-lista">
            {datos.pendientes.map((p) => (
              <li key={p.codigo} className="cu-pendiente">
                <IconAlerta />
                <div>
                  <strong>{p.titulo}: {p.cantidad}</strong>
                  {p.detalle && <span>{p.detalle}</span>}
                </div>
              </li>
            ))}
          </ul>
          <Link className="cu-btn" to="/inicio">Resolver mis pendientes</Link>
        </>
      )}

      {datos?.puede_cerrar && <Formulario usuario={usuario} alTerminar={terminar} />}
    </Pantalla>
  );
}
