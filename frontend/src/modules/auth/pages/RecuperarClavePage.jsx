import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import { recuperarClave } from '../services/authService.js';
import { IconEscudo, IconFlechaAtras, IconLlave } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './VerificarCorreoPage.css';
import './RecuperarClavePage.css';

export default function RecuperarClavePage() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const enviar = async (e) => {
    e.preventDefault();
    if (!correo.trim()) return;
    setError('');
    setCargando(true);
    try {
      await recuperarClave(correo);
      // Siempre se avanza: la respuesta es la misma exista o no el correo.
      navigate('/recuperar/codigo', { state: { correo: correo.trim().toLowerCase() } });
    } catch (err) {
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

        <span className="verificar-sello"><IconLlave width="28" height="28" /></span>

        <h1 style={{ marginTop: 20 }}>¿Olvidaste tu contraseña?</h1>
        <p className="login-sub">
          Escribe tu correo y te enviamos un código de 6 dígitos para crear una nueva.
        </p>

        <form className="login-form" onSubmit={enviar}>
          <div>
            <label className="label" htmlFor="email">Correo electrónico</label>
            <div className="campo">
              <span className="campo-icono"><IconCorreo /></span>
              <input id="email" className="input" type="email" autoComplete="email" placeholder="nombre@correo.com"
                value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>

          {error && <p className="registro-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={!correo.trim() || cargando}>
            {cargando ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>

        <p className="verificar-aviso recuperar-aviso">
          <IconEscudo width="16" height="16" />
          <span>Si el correo está registrado, recibirás el código en unos minutos. Revisa también la carpeta de spam.</span>
        </p>

        <p className="login-pie recuperar-volver">
          <Link className="enlace" to="/login">Volver a iniciar sesión</Link>
        </p>
      </main>
    </div>
  );
}
