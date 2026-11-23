import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconCandado, IconCorreo, IconOjo, IconOjoCerrado, IconPata } from '@/shared/components/Icons.jsx';
import { useAuth } from '../AuthContext.jsx';
import { login, loginGoogle, loginMicrosoft, reenviarCodigo } from '../services/authService.js';
import BotonGoogle from '../components/BotonGoogle.jsx';
import BotonMicrosoft from '../components/BotonMicrosoft.jsx';
import { CaminoHuellas, PerroYGato } from '../components/DecoracionMascotas.jsx';
import './LoginPage.css';
import '../i18n.js';
import { useIdioma } from '@/modules/region';

export default function LoginPage() {
  const { t } = useIdioma();
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
    const id = setTimeout(() => {
      setBloqueadoHasta(null);
      setError('');
    }, Math.max(0, bloqueadoHasta - Date.now()));
    return () => clearTimeout(id);
  }, [bloqueadoHasta]);

  // Misma salida para la clave y los proveedores sociales.
  const continuar = (r, correoUsuario) => {
    // Equipo nuevo con verificación en dos pasos: la sesión se crea después del código.
    if (r.requiere2fa) {
      navigate('/verificar-2fa', { state: { correo: correoUsuario, token2fa: r.token2fa } });
      return;
    }
    iniciarSesion(r);
    navigate('/inicio');
  };

  const mostrarError = (err) => {
    if (err.codigo === 'CUENTA_BLOQUEADA') {
      setBloqueadoHasta(Date.now() + err.datos.minutos * 60000);
    }
    setError(err.message);
  };

  const entrar = async (e) => {
    e.preventDefault();
    if (bloqueadoHasta) return;
    setError('');
    setCargando(true);
    try {
      continuar(await login(correo, clave), correo.trim().toLowerCase());
    } catch (err) {
      if (err.codigo === 'CORREO_SIN_VERIFICAR') {
        // Si el reenvío falla (p. ej. aún no pasan 60 s) ya hay un código vigente: se sigue igual.
        await reenviarCodigo(correo).catch(() => {});
        navigate('/verificar-correo', { state: { correo: correo.trim().toLowerCase() } });
        return;
      }
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  };

  // Google y Microsoft siguen el mismo camino: el backend valida el token y responde como /login.
  const entrarConProveedor = (pedir) => async (token) => {
    if (bloqueadoHasta) return;
    setError('');
    setCargando(true);
    try {
      const r = await pedir(token);
      continuar(r, r.correo);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  };
  const entrarConGoogle = entrarConProveedor(loginGoogle);
  const entrarConMicrosoft = entrarConProveedor(loginMicrosoft);

  return (
    <div className="login-fondo login-fondo--huellas">
      <CaminoHuellas />
      <main className="login login--inicio">
        <PerroYGato />

        <div className="login-marca">
          <span className="login-logo"><IconPata /></span>
          Red de Cuidadores
        </div>

        <h1>{t('auth.login.titulo')} <span className="login-saludo" aria-hidden="true">🐾</span></h1>
        <p className="login-sub">{t('auth.login.sub')}</p>

        {state?.cuentaActivada && (
          <p className="login-exito" role="status">{t('auth.login.cuentaActivada')}</p>
        )}

        {state?.claveActualizada && (
          <p className="login-exito" role="status">{t('auth.login.claveActualizada')}</p>
        )}

        <form className="login-form" onSubmit={entrar}>
          <div>
            <label className="label" htmlFor="email">{t('auth.correo')}</label>
            <div className="campo">
              <span className="campo-icono"><IconCorreo /></span>
              <input id="email" className="input" type="email" autoComplete="email" placeholder={t('auth.correoPlaceholder')}
                value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="clave">{t('auth.clave')}</label>
            <div className="campo">
              <span className="campo-icono"><IconCandado /></span>
              <input id="clave" className="input con-ojo" type={verClave ? 'text' : 'password'} autoComplete="current-password" placeholder={t('auth.login.clavePlaceholder')}
                value={clave} onChange={(e) => setClave(e.target.value)} required />
              <button type="button" className="campo-ojo" aria-label={t(verClave ? 'auth.ocultarClave' : 'auth.mostrarClave')} onClick={() => setVerClave(!verClave)}>
                {verClave ? <IconOjoCerrado /> : <IconOjo />}
              </button>
            </div>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="login-fila">
            <label className="login-check">
              <input type="checkbox" defaultChecked />
              {t('auth.login.mantener')}
            </label>
            <Link className="enlace" to="/recuperar" style={{ fontSize: 14 }}>{t('auth.olvidaste')}</Link>
          </div>

          <button type="submit" className="btn-primary" disabled={cargando || !!bloqueadoHasta}>
            {t(cargando ? 'auth.login.ingresando' : 'auth.login.ingresar')}
          </button>
        </form>

        <div className="login-o">{t('auth.login.o')}</div>
        <div className="login-redes">
          <BotonGoogle onCredencial={entrarConGoogle} onError={setError} deshabilitado={cargando || !!bloqueadoHasta} />
          <BotonMicrosoft onIdToken={entrarConMicrosoft} onError={setError} deshabilitado={cargando || !!bloqueadoHasta} />
        </div>

        <p className="login-pie">
          {t('auth.login.sinCuenta')} <Link className="enlace" to="/registro">{t('auth.login.crearCuenta')}</Link>
        </p>
      </main>
    </div>
  );
}