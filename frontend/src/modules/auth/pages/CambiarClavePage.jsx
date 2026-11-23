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
import '../i18n.js';
import { useIdioma } from '@/modules/region';

export default function CambiarClavePage() {
  const { t } = useIdioma();
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
  const [exito, setExito] = useState(''); // clave de traducción
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
      setExito(sinClave ? 'auth.cambiarClave.exitoCreada' : 'auth.cambiarClave.exitoActualizada');
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
        <Link className="registro-atras" to="/configuracion" onClick={(e) => { e.preventDefault(); navigate(-1); }} aria-label={t('auth.volver')}>
          <IconFlechaAtras />
        </Link>

        <h1 style={{ marginTop: 20 }}>{t(sinClave ? 'auth.cambiarClave.tituloCrear' : 'auth.cambiarClave.tituloCambiar')}</h1>
        <p className="login-sub">
          {sinClave
            ? t('auth.cambiarClave.subCrear')
            : t('auth.cambiarClave.subCambiar')}
        </p>

        {exito && <p className="login-exito" role="status">{t(exito)}</p>}

        <form className="login-form" onSubmit={guardar}>
          {sinClave ? (
            <ConfirmarConCodigo valor={codigo} onChange={setCodigo} deshabilitado={cargando} />
          ) : (
            <>
              <CampoClave id="actual" etiqueta={t('auth.cambiarClave.actual')} placeholder={t('auth.claveActualPlaceholder')} autoComplete="current-password"
                valor={actual} onChange={setActual} ver={verActual} onVer={() => setVerActual(!verActual)} />
              <Link className="enlace" to="/recuperar">{t('auth.olvidaste')}</Link>
            </>
          )}

          <CampoClave id="clave" etiqueta={t('auth.nuevaClave')} placeholder={t('auth.creaClavePlaceholder')}
            valor={clave} onChange={setClave} ver={verClave} onVer={() => setVerClave(!verClave)} />
          <CampoClave id="confirmar" etiqueta={t('auth.cambiarClave.confirmarNueva')} placeholder={t('auth.repiteClavePlaceholder')}
            valor={confirmar} onChange={setConfirmar} ver={verConfirmar} onVer={() => setVerConfirmar(!verConfirmar)} />

          <ReglasClave clave={clave} extras={[{ id: 'coinciden', texto: t('auth.coinciden'), ok: coinciden }]} />

          <label className="verificar-info" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
            <input type="checkbox" checked={cerrarOtras} onChange={(e) => setCerrarOtras(e.target.checked)} />
            {t('auth.cambiarClave.cerrarOtras')}
          </label>

          {error && <p className="registro-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={!completo || cargando}>
            {t(cargando ? 'auth.guardando' : sinClave ? 'auth.cambiarClave.crear' : 'auth.cambiarClave.actualizar')}
          </button>
        </form>
      </main>
    </div>
  );
}
