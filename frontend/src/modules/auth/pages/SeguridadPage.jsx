import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import {
  cambiar2fa, cerrarSesionDispositivo, cerrarTodasLasSesiones, listarSesiones,
} from '../services/authService.js';
import CampoClave from '../components/CampoClave.jsx';
import {
  IconChevron, IconComputador, IconEscudo, IconFlechaAtras, IconTablet, IconTelefono,
} from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './SeguridadPage.css';

const ICONOS = { telefono: IconTelefono, tablet: IconTablet, computador: IconComputador };
const ESTE = { telefono: 'Este teléfono', tablet: 'Esta tableta', computador: 'Este equipo' };

const tiempo = new Intl.RelativeTimeFormat('es', { numeric: 'always' });

// ultima_actividad se refresca como mucho cada minuto, así que menos de 2 minutos cuenta como "ahora".
function haceCuanto(fecha) {
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 2) return 'activo ahora';
  if (minutos < 60) return tiempo.format(-minutos, 'minute');
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return tiempo.format(-horas, 'hour');
  const dias = Math.floor(horas / 24);
  if (dias < 7) return tiempo.format(-dias, 'day');
  return tiempo.format(-Math.floor(dias / 7), 'week');
}

function nombreDispositivo(s) {
  if (!s.actual || !s.so) return s.dispositivo;
  return `${ESTE[s.tipo] ?? 'Este equipo'} · ${s.so}`;
}

export default function SeguridadPage() {
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(null); // id de la sesión que se está cerrando, o 'todas'
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const { usuario, actualizarUsuario } = useAuth();
  const [confirmar2fa, setConfirmar2fa] = useState(false); // panel para pedir la clave antes de cambiar el interruptor
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [guardando2fa, setGuardando2fa] = useState(false);
  const [error2fa, setError2fa] = useState('');
  const [exito2fa, setExito2fa] = useState('');

  // Para cuidadores es obligatoria; dos_pasos falta en sesiones anteriores a esta función (entonces no estaba activa).
  const obligatoria = usuario?.rol === 'cuidador';
  const dosPasos = obligatoria || Boolean(usuario?.dos_pasos);

  // Las respuestas SESION_CERRADA las maneja AuthContext (cierra la sesión local y ProtectedRoute lleva al login).
  useEffect(() => {
    let activo = true;
    listarSesiones()
      .then((r) => {
        if (!activo) return;
        // La sesión actual siempre arriba; las demás, de la más reciente a la más antigua.
        setSesiones([...r.sesiones].sort((a, b) => Number(b.actual) - Number(a.actual)));
      })
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  const otras = sesiones.filter((s) => !s.actual);

  const cancelar2fa = () => {
    setConfirmar2fa(false);
    setClave('');
    setVerClave(false);
    setError2fa('');
  };

  const abrir2fa = () => {
    if (obligatoria) return;
    setExito2fa('');
    if (confirmar2fa) cancelar2fa();
    else setConfirmar2fa(true);
  };

  const guardar2fa = async (e) => {
    e.preventDefault();
    if (!clave) return;
    setError2fa('');
    setGuardando2fa(true);
    try {
      const r = await cambiar2fa(!dosPasos, clave);
      actualizarUsuario(r.usuario);
      cancelar2fa();
      setExito2fa(r.usuario.dos_pasos ? 'Activamos la verificación en dos pasos.' : 'Desactivamos la verificación en dos pasos.');
    } catch (err) {
      setError2fa(err.message);
      setClave('');
    } finally {
      setGuardando2fa(false);
    }
  };

  const cerrarUna = async (id) => {
    setError('');
    setExito('');
    setCerrando(id);
    try {
      await cerrarSesionDispositivo(id);
      setSesiones((lista) => lista.filter((s) => s.id !== id));
    } catch (err) {
      // 404: ya estaba cerrada (p. ej. desde otro dispositivo); igual se quita de la lista.
      if (err.status === 404) setSesiones((lista) => lista.filter((s) => s.id !== id));
      else setError(err.message);
    } finally {
      setCerrando(null);
    }
  };

  const cerrarTodas = async () => {
    setError('');
    setExito('');
    setCerrando('todas');
    try {
      const r = await cerrarTodasLasSesiones();
      setSesiones((lista) => lista.filter((s) => s.actual));
      setExito(r.cerradas === 1 ? 'Cerramos 1 sesión.' : `Cerramos ${r.cerradas} sesiones.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCerrando(null);
    }
  };

  return (
    <div className="login-fondo">
      <main className="login seguridad">
        <div className="seguridad-cabecera">
          <Link className="registro-atras" to="/configuracion" onClick={(e) => { e.preventDefault(); navigate(-1); }} aria-label="Volver">
            <IconFlechaAtras />
          </Link>
          <h1>Seguridad</h1>
        </div>

        <div className={`seguridad-banner${dosPasos ? '' : ' seguridad-banner-pendiente'}`}>
          <IconEscudo width="20" height="20" />
          <span>
            <strong>{dosPasos ? 'Tu cuenta está protegida' : 'Protege más tu cuenta'}</strong>
            {dosPasos ? 'Verificación en dos pasos activa.' : 'Activa la verificación en dos pasos.'}
          </span>
        </div>

        <h2 className="seguridad-titulo">Inicio de sesión</h2>
        <div className="seguridad-tarjeta">
          <div className="seguridad-fila">
            <span className="seguridad-info">
              <span className="seguridad-nombre" id="dos-pasos-titulo">Verificación en dos pasos</span>
              <span className="seguridad-detalle">
                {obligatoria
                  ? 'Obligatoria para cuidadores'
                  : 'Pedimos un código al correo cada vez que entras desde un equipo nuevo.'}
              </span>
            </span>
            <button type="button" role="switch" className="seguridad-interruptor" aria-checked={dosPasos}
              aria-labelledby="dos-pasos-titulo" aria-expanded={obligatoria ? undefined : confirmar2fa}
              disabled={obligatoria || guardando2fa} onClick={abrir2fa}>
              <span className="seguridad-interruptor-perilla" />
            </button>
          </div>

          {confirmar2fa && (
            <form className="seguridad-fila seguridad-confirmar" onSubmit={guardar2fa}>
              <CampoClave id="clave-2fa" etiqueta="Confirma tu contraseña" placeholder="Tu contraseña actual"
                valor={clave} onChange={setClave} ver={verClave} onVer={() => setVerClave(!verClave)}
                autoComplete="current-password" />
              {error2fa && <p className="registro-error" role="alert">{error2fa}</p>}
              <div className="seguridad-acciones">
                <button type="button" className="btn-secundario" onClick={cancelar2fa} disabled={guardando2fa}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={!clave || guardando2fa}>
                  {guardando2fa ? 'Guardando…' : dosPasos ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </form>
          )}

          <Link className="seguridad-fila seguridad-enlace" to="/configuracion/cambiar-clave">
            <span className="seguridad-nombre">Cambiar contraseña</span>
            <IconChevron />
          </Link>
        </div>
        {exito2fa && <p className="login-exito seguridad-aviso" role="status">{exito2fa}</p>}

        <h2 className="seguridad-titulo">Dispositivos con sesión abierta</h2>
        {cargando ? (
          <p className="login-sub">Cargando tus sesiones…</p>
        ) : (
          sesiones.length > 0 && (
            <ul className="seguridad-tarjeta">
              {sesiones.map((s) => {
                const Icono = ICONOS[s.tipo] ?? IconComputador;
                return (
                  <li key={s.id} className="seguridad-fila">
                    <span className="seguridad-icono"><Icono /></span>
                    <span className="seguridad-info">
                      <span className="seguridad-nombre">{nombreDispositivo(s)}</span>
                      <span className="seguridad-detalle">
                        {s.ciudad ?? 'Ubicación desconocida'} · {s.actual ? 'activo ahora' : haceCuanto(s.ultimaActividad)}
                      </span>
                    </span>
                    {s.actual ? (
                      <span className="seguridad-actual">Actual</span>
                    ) : (
                      <button type="button" className="seguridad-cerrar" onClick={() => cerrarUna(s.id)}
                        disabled={cerrando !== null} aria-label={`Cerrar sesión en ${s.dispositivo}`}>
                        {cerrando === s.id ? 'Cerrando…' : 'Cerrar'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        )}

        {exito && <p className="login-exito" role="status">{exito}</p>}
        {error && <p className="registro-error seguridad-error" role="alert">{error}</p>}

        <button type="button" className="seguridad-cerrar-todas" onClick={cerrarTodas}
          disabled={cargando || otras.length === 0 || cerrando !== null}>
          {cerrando === 'todas' ? 'Cerrando sesiones…' : 'Cerrar sesión en todos los dispositivos'}
        </button>
      </main>
    </div>
  );
}
