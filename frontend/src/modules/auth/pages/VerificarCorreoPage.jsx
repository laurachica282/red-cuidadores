import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import { useAuth } from '../AuthContext.jsx';
import {
  recuperarClave, reenviar2fa, reenviarCodigo, verificar2fa, verificarCodigoRecuperacion, verificarCorreo,
} from '../services/authService.js';
import CodigoVerificacion from '../components/CodigoVerificacion.jsx';
import { IconEscudo, IconFlechaAtras } from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './VerificarCorreoPage.css';

const ESPERA = 60;

// Lo que cambia entre verificar el correo del registro, el código de recuperación de clave y la verificación en dos pasos.
const MODOS = {
  registro: {
    claveCorreo: 'correoPorVerificar',
    volverA: '/registro',
    titulo: 'Revisa tu correo',
    verificar: async ({ correo, codigo, navigate }) => {
      await verificarCorreo(correo, codigo);
      navigate('/login', { state: { cuentaActivada: true } });
    },
    reenviar: ({ correo }) => reenviarCodigo(correo),
  },
  recuperacion: {
    claveCorreo: 'correoPorRecuperar',
    volverA: '/recuperar',
    titulo: 'Revisa tu correo',
    verificar: async ({ correo, codigo, navigate }) => {
      const { token } = await verificarCodigoRecuperacion(correo, codigo);
      navigate('/recuperar/nueva-clave', { state: { token }, replace: true });
    },
    reenviar: ({ correo }) => recuperarClave(correo),
  },
  '2fa': {
    claveCorreo: 'correoPor2fa',
    claveToken: 'token2fa',
    volverA: '/login',
    titulo: 'Confirma que eres tú',
    intro: 'Entraste desde un equipo nuevo. ',
    verificar: async ({ token2fa, codigo, navigate, iniciarSesion }) => {
      iniciarSesion(await verificar2fa(token2fa, codigo));
      navigate('/inicio', { replace: true });
    },
    reenviar: ({ token2fa }) => reenviar2fa(token2fa),
  },
};

const enmascarar = (correo) => {
  const [usuario, dominio] = correo.split('@');
  return `${usuario.slice(0, 2)}•••••@${dominio}`;
};

const reloj = (s) => `0:${String(s).padStart(2, '0')}`;

// Lo que llega en el state se guarda en sessionStorage para que sobreviva a una recarga.
const leerDato = (valor, clave) => {
  if (!clave) return null;
  if (valor) {
    try { sessionStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ }
    return valor;
  }
  try { return sessionStorage.getItem(clave); } catch { return null; }
};

const olvidarDatos = (config) => {
  try {
    sessionStorage.removeItem(config.claveCorreo);
    if (config.claveToken) sessionStorage.removeItem(config.claveToken);
  } catch { /* sin almacenamiento */ }
};

export default function VerificarCorreoPage({ modo = 'registro' }) {
  const config = MODOS[modo];
  const { state } = useLocation();
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [correo] = useState(() => leerDato(state?.correo, config.claveCorreo));
  const [token2fa] = useState(() => leerDato(state?.token2fa, config.claveToken));
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

  if (!correo || (config.claveToken && !token2fa)) return <Navigate to={config.volverA} replace />;

  // El token del paso intermedio venció (10 min) o la clave cambió: hay que volver a ingresar.
  const tokenVencido = (err) => {
    if (err.codigo !== 'TOKEN_INVALIDO') return false;
    olvidarDatos(config);
    navigate(config.volverA, { replace: true });
    return true;
  };

  const verificar = async (e) => {
    e.preventDefault();
    if (codigo.length < 6) return;
    setError('');
    setInfo('');
    setCargando(true);
    try {
      await config.verificar({ correo, token2fa, codigo, navigate, iniciarSesion });
      olvidarDatos(config);
    } catch (err) {
      if (tokenVencido(err)) return;
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
      await config.reenviar({ correo, token2fa });
      setCodigo('');
      setInfo('Te enviamos un código nuevo.');
      setSegundos(ESPERA);
    } catch (err) {
      if (tokenVencido(err)) return;
      if (err.datos?.segundos) setSegundos(err.datos.segundos);
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

        <h1 style={{ marginTop: 20 }}>{config.titulo}</h1>
        <p className="login-sub">
          {config.intro}Enviamos un código de 6 dígitos a <strong>{enmascarar(correo)}</strong>. Escríbelo para continuar.
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
