import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import {
  recuperarClave, reenviarCodigo, verificarCodigoRecuperacion, verificarCorreo,
} from '../services/authService.js';
import CodigoVerificacion from '../components/CodigoVerificacion.jsx';
import { IconEscudo, IconFlechaAtras } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './VerificarCorreoPage.css';

const ESPERA = 60;

// Lo que cambia entre verificar el correo del registro y el código de recuperación de clave.
const MODOS = {
  registro: {
    claveCorreo: 'correoPorVerificar',
    volverA: '/registro',
    verificar: async (correo, codigo, navigate) => {
      await verificarCorreo(correo, codigo);
      navigate('/login', { state: { cuentaActivada: true } });
    },
    reenviar: reenviarCodigo,
  },
  recuperacion: {
    claveCorreo: 'correoPorRecuperar',
    volverA: '/recuperar',
    verificar: async (correo, codigo, navigate) => {
      const { token } = await verificarCodigoRecuperacion(correo, codigo);
      navigate('/recuperar/nueva-clave', { state: { token }, replace: true });
    },
    reenviar: recuperarClave,
  },
};

const enmascarar = (correo) => {
  const [usuario, dominio] = correo.split('@');
  return `${usuario.slice(0, 2)}•••••@${dominio}`;
};

const reloj = (s) => `0:${String(s).padStart(2, '0')}`;

const leerCorreo = (state, clave) => {
  if (state?.correo) {
    try { sessionStorage.setItem(clave, state.correo); } catch { /* sin almacenamiento */ }
    return state.correo;
  }
  try { return sessionStorage.getItem(clave); } catch { return null; }
};

export default function VerificarCorreoPage({ modo = 'registro' }) {
  const config = MODOS[modo];
  const { state } = useLocation();
  const navigate = useNavigate();
  const [correo] = useState(() => leerCorreo(state, config.claveCorreo));
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [segundos, setSegundos] = useState(ESPERA);

  useEffect(() => {
    if (segundos <= 0) return undefined;
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [segundos]);

  if (!correo) return <Navigate to={config.volverA} replace />;

  const verificar = async (e) => {
    e.preventDefault();
    if (codigo.length < 6) return;
    setError('');
    setInfo('');
    setCargando(true);
    try {
      await config.verificar(correo, codigo, navigate);
      try { sessionStorage.removeItem(config.claveCorreo); } catch { /* sin almacenamiento */ }
    } catch (err) {
      setError(err.message);
      setCodigo('');
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    setError('');
    setInfo('');
    try {
      await config.reenviar(correo);
      setCodigo('');
      setInfo('Te enviamos un código nuevo.');
      setSegundos(ESPERA);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-fondo">
      <main className="login registro">
        <button type="button" className="registro-atras" aria-label="Volver" onClick={() => navigate(-1)}>
          <IconFlechaAtras />
        </button>

        <span className="verificar-sello"><IconCorreo width="28" height="28" /></span>

        <h1 style={{ marginTop: 20 }}>Revisa tu correo</h1>
        <p className="login-sub">
          Enviamos un código de 6 dígitos a <strong>{enmascarar(correo)}</strong>. Escríbelo para continuar.
        </p>

        <form className="login-form" onSubmit={verificar}>
          <CodigoVerificacion valor={codigo} onChange={setCodigo} deshabilitado={cargando} />

          {error && <p className="registro-error" role="alert">{error}</p>}
          {info && <p className="verificar-info" role="status">{info}</p>}

          <button type="submit" className="btn-primary" disabled={codigo.length < 6 || cargando}>
            {cargando ? 'Verificando…' : 'Verificar'}
          </button>
        </form>

        <div className="verificar-reenvio">
          <span>¿No te llegó el código?</span>
          {segundos > 0 ? (
            <span className="verificar-contador">Reenviar en {reloj(segundos)}</span>
          ) : (
            <button type="button" className="enlace" onClick={reenviar}>Reenviar código</button>
          )}
        </div>

        <p className="verificar-aviso">
          <IconEscudo width="16" height="16" />
          <span>El código vence en 10 minutos. Nunca lo compartas con nadie, ni siquiera con nosotros.</span>
        </p>
      </main>
    </div>
  );
}
