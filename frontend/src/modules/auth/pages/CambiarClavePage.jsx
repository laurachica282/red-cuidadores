import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { cambiarClave } from '../services/authService.js';
import CampoClave from '../components/CampoClave.jsx';
import ReglasClave from '../components/ReglasClave.jsx';
import ConfirmarConCodigo from '../components/ConfirmarConCodigo.jsx';
import { claveValida } from '../components/reglasClave.js';
import { IconFlechaAtras } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './VerificarCorreoPage.css';

export default function CambiarClavePage() {
  const navigate = useNavigate();
  const { usuario, iniciarSesion, actualizarUsuario, cerrarSesion } = useAuth();
  // Cuenta creada con Google/Microsoft: aún no tiene clave, así que se crea confirmando con un código al correo.
  // tiene_clave falta en sesiones anteriores a esta función (entonces sí había clave).
  const sinClave = usuario?.tiene_clave === false;
  const [actual, setActual] = useState('');
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [cerrarOtras, setCerrarOtras] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const coinciden = clave !== '' && clave === confirmar;
  const confirmado = sinClave ? codigo.length === 6 : actual !== '';
  const completo = confirmado && claveValida(clave) && coinciden;

  const guardar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setError('');
    setExito('');
    setCargando(true);
    try {
      const r = await cambiarClave(sinClave
        ? { codigo, claveNueva: clave, cerrarOtras }
        : { claveActual: actual, claveNueva: clave, cerrarOtras });
      // Con "cerrar otras" el servidor invalida los tokens anteriores y entrega uno nuevo para esta sesión.
      if (r.token) iniciarSesion({ token: r.token, usuario: r.usuario });
      else if (r.usuario) actualizarUsuario(r.usuario);
      setActual('');
      setCodigo('');
      setClave('');
      setConfirmar('');
      setCerrarOtras(true);
      setExito(sinClave ? 'Tu contraseña fue creada. Ya puedes entrar también con tu correo y contraseña.' : 'Tu contraseña fue actualizada.');
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

        <h1 style={{ marginTop: 20 }}>{sinClave ? 'Crear contraseña' : 'Cambiar contraseña'}</h1>
        <p className="login-sub">
          {sinClave
            ? 'Entras con una cuenta de Google o Microsoft. Para crear una contraseña, confirma con un código que te enviaremos al correo.'
            : 'Para tu seguridad, primero confirma la contraseña que usas ahora.'}
        </p>

        {exito && <p className="login-exito" role="status">{exito}</p>}

        <form className="login-form" onSubmit={guardar}>
          {sinClave ? (
            <ConfirmarConCodigo valor={codigo} onChange={setCodigo} deshabilitado={cargando} />
          ) : (
            <>
              <CampoClave id="actual" etiqueta="Contraseña actual" placeholder="Tu contraseña actual" autoComplete="current-password"
                valor={actual} onChange={setActual} ver={verActual} onVer={() => setVerActual(!verActual)} />
              <Link className="enlace" to="/recuperar">¿Olvidaste tu contraseña?</Link>
            </>
          )}

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
            {cargando ? 'Guardando…' : sinClave ? 'Crear contraseña' : 'Actualizar contraseña'}
          </button>
        </form>
      </main>
    </div>
  );
}
