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
import '../i18n.js';
import { useIdioma } from '@/modules/region';

export default function NuevaClavePage() {
  const { t } = useIdioma();
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
        <Link className="registro-atras" to="/login" aria-label={t('auth.volverLogin')}>
          <IconFlechaAtras />
        </Link>

        <h1 style={{ marginTop: 20 }}>{t('auth.nuevaClave.titulo')}</h1>
        <p className="login-sub">{t('auth.nuevaClave.sub')}</p>

        <form className="login-form" onSubmit={guardar}>
          <CampoClave id="clave" etiqueta={t('auth.nuevaClave')} placeholder={t('auth.creaClavePlaceholder')}
            valor={clave} onChange={setClave} ver={verClave} onVer={() => setVerClave(!verClave)} />
          <CampoClave id="confirmar" etiqueta={t('auth.nuevaClave.confirmar')} placeholder={t('auth.repiteClavePlaceholder')}
            valor={confirmar} onChange={setConfirmar} ver={verConfirmar} onVer={() => setVerConfirmar(!verConfirmar)} />

          <ReglasClave clave={clave} extras={[{ id: 'coinciden', texto: t('auth.coinciden'), ok: coinciden }]} />

          {error && (
            <p className="registro-error" role="alert">
              {error} {tokenVencido && <Link className="enlace" to="/recuperar">{t('auth.nuevaClave.pedirCodigo')}</Link>}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={!completo || cargando}>
            {t(cargando ? 'auth.guardando' : 'auth.nuevaClave.guardar')}
          </button>
        </form>

        <p className="verificar-info" style={{ marginTop: 16, textAlign: 'center', fontWeight: 400 }}>
          {t('auth.nuevaClave.aviso')}
        </p>
      </main>
    </div>
  );
}
