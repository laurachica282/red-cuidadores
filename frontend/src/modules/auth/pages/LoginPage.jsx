import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconCandado, IconCorreo, IconOjo, IconOjoCerrado, IconPata } from '@/shared/components/Icons.jsx';
import { useAuth } from '../AuthContext.jsx';
import { login, reenviarCodigo } from '../services/authService.js';
import './LoginPage.css';

export default function LoginPage() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  // Al vencer el bloqueo se rehabilita el botón y se quita el aviso.
  useEffect(() => {
    if (!bloqueadoHasta) return undefined;
    const t = setTimeout(() => {
      setBloqueadoHasta(null);
      setError('');
    }, Math.max(0, bloqueadoHasta - Date.now()));
    return () => clearTimeout(t);
  }, [bloqueadoHasta]);

  const entrar = async (e) => {
    e.preventDefault();
    if (bloqueadoHasta) return;
    setError('');
    setCargando(true);
    try {
      iniciarSesion(await login(correo, clave));
      navigate('/inicio');
    } catch (err) {
      if (err.codigo === 'CORREO_SIN_VERIFICAR') {
        // Si el reenvío falla (p. ej. aún no pasan 60 s) ya hay un código vigente: se sigue igual.
        await reenviarCodigo(correo).catch(() => {});
        navigate('/verificar-correo', { state: { correo: correo.trim().toLowerCase() } });
        return;
      }
      if (err.codigo === 'CUENTA_BLOQUEADA') {
        setBloqueadoHasta(Date.now() + err.datos.minutos * 60000);
      }
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-fondo">
      <main className="login">
        <div className="login-marca">
          <span className="login-logo"><IconPata /></span>
          Red de Cuidadores
        </div>

        <h1>Inicia sesión</h1>
        <p className="login-sub">Deja a tu mascota con vecinos de confianza, sin preocuparte.</p>

        {state?.cuentaActivada && (
          <p className="login-exito" role="status">¡Cuenta activada! Ya puedes iniciar sesión.</p>
        )}

        {state?.claveActualizada && (
          <p className="login-exito" role="status">Contraseña actualizada. Inicia sesión con la nueva.</p>
        )}

        <form className="login-form" onSubmit={entrar}>
          <div>
            <label className="label" htmlFor="email">Correo electrónico</label>
            <div className="campo">
              <span className="campo-icono"><IconCorreo /></span>
              <input id="email" className="input" type="email" autoComplete="email" placeholder="nombre@correo.com"
                value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="clave">Contraseña</label>
            <div className="campo">
              <span className="campo-icono"><IconCandado /></span>
              <input id="clave" className="input con-ojo" type={verClave ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña"
                value={clave} onChange={(e) => setClave(e.target.value)} required />
              <button type="button" className="campo-ojo" aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVerClave(!verClave)}>
                {verClave ? <IconOjoCerrado /> : <IconOjo />}
              </button>
            </div>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="login-fila">
            <label className="login-check">
              <input type="checkbox" defaultChecked />
              Mantener sesión iniciada
            </label>
            <Link className="enlace" to="/recuperar" style={{ fontSize: 14 }}>¿Olvidaste tu contraseña?</Link>
          </div>

          <button type="submit" className="btn-primary" disabled={cargando || !!bloqueadoHasta}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="login-o">o continúa con</div>
        <div className="login-redes">
          <button type="button" className="btn-secundario">Google</button>
          <button type="button" className="btn-secundario">Apple</button>
        </div>

        <p className="login-pie">
          ¿Aún no tienes cuenta? <Link className="enlace" to="/registro">Crear cuenta</Link>
        </p>
      </main>
    </div>
  );
}