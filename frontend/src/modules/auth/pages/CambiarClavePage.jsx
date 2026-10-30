import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { cambiarClave } from '../services/authService.js';
import CampoClave from '../components/CampoClave.jsx';
import ReglasClave from '../components/ReglasClave.jsx';
import { claveValida } from '../components/reglasClave.js';
import { IconFlechaAtras } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './VerificarCorreoPage.css';

export default function CambiarClavePage() {
  const navigate = useNavigate();
  const { iniciarSesion, cerrarSesion } = useAuth();
  const [actual, setActual] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [cerrarOtras, setCerrarOtras] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const coinciden = clave !== '' && clave === confirmar;
  const completo = actual !== '' && claveValida(clave) && coinciden;

  const guardar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setError('');
    setExito(false);
    setCargando(true);
    try {
      const r = await cambiarClave({ claveActual: actual, claveNueva: clave, cerrarOtras });
      // Con "cerrar otras" el servidor invalida los tokens anteriores y entrega uno nuevo para esta sesión.
      if (r.token) iniciarSesion({ token: r.token, usuario: r.usuario });
      setActual('');
      setClave('');
      setConfirmar('');
      setCerrarOtras(true);
      setExito(true);
    } catch (err) {
      if (err.codigo === 'SESION_CERRADA') {
        cerrarSesion();
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-fondo">
      <main className="login registro">
        <Link className="registro-atras" to="/configuracion" onClick={(e) => { e.preventDefault(); navigate(-1); }} aria-label="Volver">
          <IconFlechaAtras />
        </Link>

        <h1 style={{ marginTop: 20 }}>Cambiar contraseña</h1>
        <p className="login-sub">Para tu seguridad, primero confirma la contraseña que usas ahora.</p>

        {exito && <p className="login-exito" role="status">Tu contraseña fue actualizada.</p>}

        <form className="login-form" onSubmit={guardar}>
          <CampoClave id="actual" etiqueta="Contraseña actual" placeholder="Tu contraseña actual" autoComplete="current-password"
            valor={actual} onChange={setActual} ver={verActual} onVer={() => setVerActual(!verActual)} />
          <Link className="enlace" to="/recuperar">¿Olvidaste tu contraseña?</Link>

          <CampoClave id="clave" etiqueta="Nueva contraseña" placeholder="Crea una contraseña"
            valor={clave} onChange={setClave} ver={verClave} onVer={() => setVerClave(!verClave)} />
          <CampoClave id="confirmar" etiqueta="Confirma la nueva contraseña" placeholder="Repite la contraseña"
            valor={confirmar} onChange={setConfirmar} ver={verConfirmar} onVer={() => setVerConfirmar(!verConfirmar)} />

          <ReglasClave clave={clave} extras={[{ id: 'coinciden', texto: 'Las dos contraseñas coinciden', ok: coinciden }]} />

          <label className="verificar-info" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
            <input type="checkbox" checked={cerrarOtras} onChange={(e) => setCerrarOtras(e.target.checked)} />
            Cerrar sesión en mis otros dispositivos
          </label>

          {error && <p className="registro-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={!completo || cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </main>
    </div>
  );
}
