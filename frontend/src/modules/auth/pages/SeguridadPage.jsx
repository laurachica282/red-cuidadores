import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cerrarSesionDispositivo, cerrarTodasLasSesiones, listarSesiones } from '../services/authService.js';
import {
  IconChevron, IconComputador, IconFlechaAtras, IconTablet, IconTelefono,
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

        <h2 className="seguridad-titulo">Inicio de sesión</h2>
        <div className="seguridad-tarjeta">
          <Link className="seguridad-fila seguridad-enlace" to="/configuracion/cambiar-clave">
            <span className="seguridad-nombre">Cambiar contraseña</span>
            <IconChevron />
          </Link>
        </div>

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
