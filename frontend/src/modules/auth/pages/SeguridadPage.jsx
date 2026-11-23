import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import {
  cambiar2fa, cerrarSesionDispositivo, cerrarTodasLasSesiones, listarSesiones,
} from '../services/authService.js';
import CampoClave from '../components/CampoClave.jsx';
import ConfirmarConCodigo from '../components/ConfirmarConCodigo.jsx';
import {
  IconChevron, IconComputador, IconEscudo, IconFlechaAtras, IconTablet, IconTelefono,
} from '../components/IconosRegistro.jsx';
import './LoginPage.css';
import './RegistroPage.css';
import './SeguridadPage.css';
import '../i18n.js';
import { useIdioma } from '@/modules/region';

const ICONOS = { telefono: IconTelefono, tablet: IconTablet, computador: IconComputador };
const ESTE = { telefono: 'auth.seguridad.esteTelefono', tablet: 'auth.seguridad.estaTableta', computador: 'auth.seguridad.esteEquipo' };

// ultima_actividad se refresca como mucho cada minuto, así que menos de 2 minutos cuenta como "ahora".
function haceCuanto(fecha, t, locale) {
  const tiempo = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 2) return t('auth.seguridad.activoAhora');
  if (minutos < 60) return tiempo.format(-minutos, 'minute');
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return tiempo.format(-horas, 'hour');
  const dias = Math.floor(horas / 24);
  if (dias < 7) return tiempo.format(-dias, 'day');
  return tiempo.format(-Math.floor(dias / 7), 'week');
}

// El servidor guarda 'Navegador desconocido' cuando no reconoce el user-agent; el resto son nombres propios (Chrome · Windows).
const DESCONOCIDO = 'Navegador desconocido';
const dispositivoLegible = (s, t) => (s.dispositivo === DESCONOCIDO ? t('auth.seguridad.navegadorDesconocido') : s.dispositivo);

function nombreDispositivo(s, t) {
  if (!s.actual || !s.so) return dispositivoLegible(s, t);
  return `${t(ESTE[s.tipo] ?? 'auth.seguridad.esteEquipo')} · ${s.so}`;
}

// El servidor guarda la ubicación como "Ciudad, País" con el país en español; se vuelve a nombrar el país
// en el idioma actual (la ciudad es nombre propio). Si el país no se reconoce, se deja tal cual.
let paisesEnEspanol = null;
function codigoDePais(nombre) {
  if (!paisesEnEspanol) {
    paisesEnEspanol = new Map();
    try {
      const es = new Intl.DisplayNames(['es'], { type: 'region' });
      const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (const a of letras) {
        for (const b of letras) {
          const nom = es.of(a + b);
          if (nom && nom !== a + b) paisesEnEspanol.set(nom, a + b);
        }
      }
    } catch { /* sin Intl.DisplayNames: se deja el texto del servidor */ }
  }
  return paisesEnEspanol.get(nombre);
}

function ubicacion(ciudad, t, pais) {
  if (!ciudad) return t('auth.seguridad.ubicacionDesconocida');
  const coma = ciudad.lastIndexOf(', ');
  if (coma < 0) return ciudad;
  const codigo = codigoDePais(ciudad.slice(coma + 2));
  return codigo ? `${ciudad.slice(0, coma)}, ${pais(codigo)}` : ciudad;
}

export default function SeguridadPage() {
  const { t, locale, pais } = useIdioma();
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(null); // id de la sesión que se está cerrando, o 'todas'
  const [error, setError] = useState('');
  const [exito, setExito] = useState(''); // { clave, n } para traducir al dibujar
  const { usuario, actualizarUsuario } = useAuth();
  const [confirmar2fa, setConfirmar2fa] = useState(false); // panel para pedir la clave antes de cambiar el interruptor
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState(''); // cuentas sin clave confirman con un código al correo
  const [verClave, setVerClave] = useState(false);
  const [guardando2fa, setGuardando2fa] = useState(false);
  const [error2fa, setError2fa] = useState('');
  const [exito2fa, setExito2fa] = useState(''); // clave de traducción

  // Para cuidadores es obligatoria; dos_pasos falta en sesiones anteriores a esta función (entonces no estaba activa).
  const obligatoria = usuario?.rol === 'cuidador';
  const dosPasos = obligatoria || Boolean(usuario?.dos_pasos);
  // Cuenta creada con Google/Microsoft sin contraseña; tiene_clave falta en sesiones anteriores (había clave).
  const sinClave = usuario?.tiene_clave === false;
  const confirmado = sinClave ? codigo.length === 6 : clave !== '';

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
    setCodigo('');
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
    if (!confirmado) return;
    setError2fa('');
    setGuardando2fa(true);
    try {
      // Solo uno de los dos viene lleno: la clave o, en cuentas sin clave, el código.
      const r = await cambiar2fa(!dosPasos, clave, codigo);
      actualizarUsuario(r.usuario);
      cancelar2fa();
      setExito2fa(r.usuario.dos_pasos ? 'auth.seguridad.activada' : 'auth.seguridad.desactivada');
    } catch (err) {
      setError2fa(err.message);
      setClave('');
      setCodigo('');
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
      setExito({ clave: r.cerradas === 1 ? 'auth.seguridad.cerradaUna' : 'auth.seguridad.cerradasVarias', n: r.cerradas });
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
          <Link className="registro-atras" to="/configuracion" onClick={(e) => { e.preventDefault(); navigate(-1); }} aria-label={t('auth.volver')}>
            <IconFlechaAtras />
          </Link>
          <h1>{t('auth.seguridad.titulo')}</h1>
        </div>

        <div className={`seguridad-banner${dosPasos ? '' : ' seguridad-banner-pendiente'}`}>
          <IconEscudo width="20" height="20" />
          <span>
            <strong>{t(dosPasos ? 'auth.seguridad.protegida' : 'auth.seguridad.protegeMas')}</strong>
            {t(dosPasos ? 'auth.seguridad.dosPasosActiva' : 'auth.seguridad.activaDosPasos')}
          </span>
        </div>

        <h2 className="seguridad-titulo">{t('auth.seguridad.inicioSesion')}</h2>
        <div className="seguridad-tarjeta">
          <div className="seguridad-fila">
            <span className="seguridad-info">
              <span className="seguridad-nombre" id="dos-pasos-titulo">{t('auth.seguridad.dosPasos')}</span>
              <span className="seguridad-detalle">
                {obligatoria
                  ? t('auth.seguridad.obligatoria')
                  : t('auth.seguridad.detalleDosPasos')}
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
              {sinClave ? (
                <ConfirmarConCodigo valor={codigo} onChange={setCodigo} deshabilitado={guardando2fa} />
              ) : (
                <CampoClave id="clave-2fa" etiqueta={t('auth.seguridad.confirmaClave')} placeholder={t('auth.claveActualPlaceholder')}
                  valor={clave} onChange={setClave} ver={verClave} onVer={() => setVerClave(!verClave)}
                  autoComplete="current-password" />
              )}
              {error2fa && <p className="registro-error" role="alert">{error2fa}</p>}
              <div className="seguridad-acciones">
                <button type="button" className="btn-secundario" onClick={cancelar2fa} disabled={guardando2fa}>
                  {t('auth.cancelar')}
                </button>
                <button type="submit" className="btn-primary" disabled={!confirmado || guardando2fa}>
                  {t(guardando2fa ? 'auth.guardando' : dosPasos ? 'auth.seguridad.desactivar' : 'auth.seguridad.activar')}
                </button>
              </div>
            </form>
          )}

          <Link className="seguridad-fila seguridad-enlace" to="/configuracion/cambiar-clave">
            <span className="seguridad-nombre">{t('auth.cambiarClave.tituloCambiar')}</span>
            <IconChevron />
          </Link>
        </div>
        {exito2fa && <p className="login-exito seguridad-aviso" role="status">{t(exito2fa)}</p>}

        <h2 className="seguridad-titulo">{t('auth.seguridad.dispositivos')}</h2>
        {cargando ? (
          <p className="login-sub">{t('auth.seguridad.cargando')}</p>
        ) : (
          sesiones.length > 0 && (
            <ul className="seguridad-tarjeta">
              {sesiones.map((s) => {
                const Icono = ICONOS[s.tipo] ?? IconComputador;
                return (
                  <li key={s.id} className="seguridad-fila">
                    <span className="seguridad-icono"><Icono /></span>
                    <span className="seguridad-info">
                      <span className="seguridad-nombre">{nombreDispositivo(s, t)}</span>
                      <span className="seguridad-detalle">
                        {ubicacion(s.ciudad, t, pais)} · {s.actual ? t('auth.seguridad.activoAhora') : haceCuanto(s.ultimaActividad, t, locale)}
                      </span>
                    </span>
                    {s.actual ? (
                      <span className="seguridad-actual">{t('auth.seguridad.actual')}</span>
                    ) : (
                      <button type="button" className="seguridad-cerrar" onClick={() => cerrarUna(s.id)}
                        disabled={cerrando !== null} aria-label={t('auth.seguridad.cerrarEn', { dispositivo: dispositivoLegible(s, t) })}>
                        {t(cerrando === s.id ? 'auth.seguridad.cerrando' : 'auth.seguridad.cerrar')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        )}

        {exito && <p className="login-exito" role="status">{t(exito.clave, { n: exito.n })}</p>}
        {error && <p className="registro-error seguridad-error" role="alert">{error}</p>}

        <button type="button" className="seguridad-cerrar-todas" onClick={cerrarTodas}
          disabled={cargando || otras.length === 0 || cerrando !== null}>
          {t(cerrando === 'todas' ? 'auth.seguridad.cerrandoSesiones' : 'auth.seguridad.cerrarTodas')}
        </button>
      </main>
    </div>
  );
}
