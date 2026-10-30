import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCandado, IconCorreo, IconOjo, IconOjoCerrado, IconPata } from '@/shared/components/Icons.jsx';
import { useAuth } from '../AuthContext.jsx';
import { login } from '../services/authService.js';
import './LoginPage.css';

export default function LoginPage() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      iniciarSesion(await login(correo, clave));
      navigate('/inicio');
    } catch (err) {
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

          <button type="submit" className="btn-primary" disabled={cargando}>
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