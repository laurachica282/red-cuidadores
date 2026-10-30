import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCandado, IconCorreo, IconOjo, IconOjoCerrado } from '@/shared/components/Icons.jsx';
import { registrar } from '../services/authService.js';
import ReglasClave from '../components/ReglasClave.jsx';
import { claveValida } from '../components/reglasClave.js';
import { IconCasa, IconFlechaAtras, IconHuella } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';

const ROLES = [
  { valor: 'viajero', titulo: 'Soy viajero', desc: 'Busco quién cuide a mi mascota', Icono: IconCasa },
  { valor: 'cuidador', titulo: 'Quiero cuidar', desc: 'Cuido mascotas en mi casa', Icono: IconHuella },
];

export default function RegistroPage() {
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
      await registrar(nombre, correo, clave, rol);
      navigate('/login');
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

        <h1>Crea tu cuenta</h1>
        <p className="login-sub">Elige cómo quieres usar la red. Puedes cambiarlo después.</p>

        <form className="login-form" onSubmit={crear}>
          <fieldset className="roles">
            <legend className="roles-leyenda">Tipo de cuenta</legend>
            {ROLES.map(({ valor, titulo, desc, Icono }) => (
              <label key={valor} className={`rol ${rol === valor ? 'rol-activo' : ''}`}>
                <input type="radio" name="rol" value={valor} checked={rol === valor} onChange={() => setRol(valor)} />
                <span className="rol-icono"><Icono /></span>
                <span className="rol-titulo">{titulo}</span>
                <span className="rol-desc">{desc}</span>
                <span className="rol-marca" aria-hidden="true" />
              </label>
            ))}
          </fieldset>

          <div>
            <label className="label" htmlFor="nombre">Nombre completo</label>
            <input id="nombre" className="input" type="text" autoComplete="name" placeholder="Como aparece en tu documento"
              value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

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
              <input id="clave" className="input con-ojo" type={verClave ? 'text' : 'password'} autoComplete="new-password" placeholder="Crea una contraseña"
                value={clave} onChange={(e) => setClave(e.target.value)} required />
              <button type="button" className="campo-ojo" aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVerClave(!verClave)}>
                {verClave ? <IconOjoCerrado /> : <IconOjo />}
              </button>
            </div>
            <ReglasClave clave={clave} />
          </div>

          <label className="login-check registro-terminos">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            Acepto los términos de uso y la política de tratamiento de datos personales
          </label>

          {error && <p className="registro-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={!completo || cargando}>
            {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="login-pie">
          ¿Ya tienes cuenta? <Link className="enlace" to="/login">Inicia sesión</Link>
        </p>
      </main>
    </div>
  );
}
