import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCandado, IconCorreo, IconOjo, IconOjoCerrado } from '@/shared/components/Icons.jsx';
import { registrar } from '../services/authService.js';
import ReglasClave from '../components/ReglasClave.jsx';
import { claveValida } from '../components/reglasClave.js';
import { IconCasa, IconFlechaAtras, IconHuella } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import '../i18n.js';
import { useIdioma } from '@/modules/region';

// titulo y desc son claves de traducción.
const ROLES = [
  { valor: 'viajero', titulo: 'auth.registro.viajeroTitulo', desc: 'auth.registro.viajeroDesc', Icono: IconCasa },
  { valor: 'cuidador', titulo: 'auth.registro.cuidadorTitulo', desc: 'auth.registro.cuidadorDesc', Icono: IconHuella },
];

export default function RegistroPage() {
  const { t } = useIdioma();
  const [rol, setRol] = useState('viajero');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const completo = nombre.trim() && correo.trim() && claveValida(clave) && acepta;

  const crear = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setError('');
    setCargando(true);
    try {
      const r = await registrar(nombre, correo, clave, rol);
      navigate('/verificar-correo', { state: { correo: r.correo ?? correo.trim().toLowerCase() } });
    } catch (err) {
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

        <h1>{t('auth.registro.titulo')}</h1>
        <p className="login-sub">{t('auth.registro.sub')}</p>

        <form className="login-form" onSubmit={crear}>
          <fieldset className="roles">
            <legend className="roles-leyenda">{t('auth.registro.tipoCuenta')}</legend>
            {ROLES.map(({ valor, titulo, desc, Icono }) => (
              <label key={valor} className={`rol ${rol === valor ? 'rol-activo' : ''}`}>
                <input type="radio" name="rol" value={valor} checked={rol === valor} onChange={() => setRol(valor)} />
                <span className="rol-icono"><Icono /></span>
                <span className="rol-titulo">{t(titulo)}</span>
                <span className="rol-desc">{t(desc)}</span>
                <span className="rol-marca" aria-hidden="true" />
              </label>
            ))}
          </fieldset>

          <div>
            <label className="label" htmlFor="nombre">{t('auth.registro.nombre')}</label>
            <input id="nombre" className="input" type="text" autoComplete="name" placeholder={t('auth.registro.nombrePlaceholder')}
              value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

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
              <input id="clave" className="input con-ojo" type={verClave ? 'text' : 'password'} autoComplete="new-password" placeholder={t('auth.creaClavePlaceholder')}
                value={clave} onChange={(e) => setClave(e.target.value)} required />
              <button type="button" className="campo-ojo" aria-label={t(verClave ? 'auth.ocultarClave' : 'auth.mostrarClave')} onClick={() => setVerClave(!verClave)}>
                {verClave ? <IconOjoCerrado /> : <IconOjo />}
              </button>
            </div>
            <ReglasClave clave={clave} />
          </div>

          <label className="login-check registro-terminos">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            {t('auth.registro.terminos')}
          </label>

          {error && <p className="registro-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={!completo || cargando}>
            {t(cargando ? 'auth.registro.creando' : 'auth.registro.crear')}
          </button>
        </form>

        <p className="login-pie">
          {t('auth.registro.yaTienes')} <Link className="enlace" to="/login">{t('auth.registro.iniciaSesion')}</Link>
        </p>
      </main>
    </div>
  );
}
