import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { restablecerClave } from '../services/authService.js';
import CampoClave from '../components/CampoClave.jsx';
import ReglasClave from '../components/ReglasClave.jsx';
import { claveValida } from '../components/reglasClave.js';
import { IconFlechaAtras } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './VerificarCorreoPage.css';

export default function NuevaClavePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [error, setError] = useState('');
  const [tokenVencido, setTokenVencido] = useState(false);
  const [cargando, setCargando] = useState(false);

  if (!state?.token) return <Navigate to="/recuperar" replace />;

  const coinciden = clave !== '' && clave === confirmar;
  const completo = claveValida(clave) && coinciden;

  const guardar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setError('');
    setCargando(true);
    try {
      await restablecerClave(state.token, clave);
      navigate('/login', { state: { claveActualizada: true }, replace: true });
    } catch (err) {
      setTokenVencido(err.codigo === 'TOKEN_INVALIDO');
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-fondo">
      <main className="login registro">
        <Link className="registro-atras" to="/login" aria-label="Volver al inicio de sesión">
          <IconFlechaAtras />
        </Link>

        <h1 style={{ marginTop: 20 }}>Crea una nueva contraseña</h1>
        <p className="login-sub">Elige una que no uses en otros sitios.</p>

        <form className="login-form" onSubmit={guardar}>
          <CampoClave id="clave" etiqueta="Nueva contraseña" placeholder="Crea una contraseña"
            valor={clave} onChange={setClave} ver={verClave} onVer={() => setVerClave(!verClave)} />
          <CampoClave id="confirmar" etiqueta="Confirma la contraseña" placeholder="Repite la contraseña"
            valor={confirmar} onChange={setConfirmar} ver={verConfirmar} onVer={() => setVerConfirmar(!verConfirmar)} />

          <ReglasClave clave={clave} extras={[{ id: 'coinciden', texto: 'Las dos contraseñas coinciden', ok: coinciden }]} />

          {error && (
            <p className="registro-error" role="alert">
              {error} {tokenVencido && <Link className="enlace" to="/recuperar">Pedir código</Link>}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={!completo || cargando}>
            {cargando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>

        <p className="verificar-info" style={{ marginTop: 16, textAlign: 'center', fontWeight: 400 }}>
          Por seguridad, cerraremos tu sesión en los demás dispositivos.
        </p>
      </main>
    </div>
  );
}
