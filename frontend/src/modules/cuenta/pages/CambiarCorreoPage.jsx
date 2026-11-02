import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import CampoClave from '../components/CampoClave.jsx';
import CampoCodigo from '../components/CampoCodigo.jsx';
import { IconEscudo } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { useCuentaRegresiva } from '../hooks/useCuentaRegresiva.js';
import {
  confirmarCambioCorreo, obtenerPerfil, solicitarCambioCorreo, sincronizarSesion,
} from '../services/cuentaService.js';
import { minutosYSegundos } from '../utils/textos.js';
import { enmascarar, validarCodigo, validarCorreo } from '../utils/validaciones.js';
import { RUTAS } from '../rutas.js';

// HU-06 (mockups 14 y 9): pide la clave, manda un código al correo NUEVO y avisa al anterior.
// El correo no cambia hasta confirmar el código.
function Flujo({ perfil }) {
  const pendiente = perfil.cambio_correo_pendiente;
  const [paso, setPaso] = useState(pendiente ? 'codigo' : 'datos');
  const [nuevo, setNuevo] = useState(pendiente?.correo_nuevo ?? '');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [correoActual, setCorreoActual] = useState(perfil.correo);
  const [espera, iniciarEspera] = useCuentaRegresiva();

  const pedirCodigo = async (e) => {
    e?.preventDefault();
    setError('');
    if (validarCorreo(nuevo)) return setError(validarCorreo(nuevo));
    setCargando(true);
    try {
      const r = await solicitarCambioCorreo(nuevo.trim(), clave);
      iniciarEspera(r.reenvio_segundos ?? 60);
      setCodigo('');
      setPaso('codigo');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError('');
    if (validarCodigo(codigo)) return setError(validarCodigo(codigo));
    setCargando(true);
    try {
      const r = await confirmarCambioCorreo(codigo);
      sincronizarSesion({ correo: r.correo });
      setCorreoActual(r.correo);
      setClave('');
      setPaso('listo');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  if (paso === 'listo') {
    return (
      <div className="cu-form">
        <Aviso tipo="ok">Tu correo se actualizó. Te enviamos un aviso al correo anterior.</Aviso>
        <div className="cu-tarjeta cu-tarjeta-suave">
          <p className="cu-item-meta">Tu correo ahora es</p>
          <p className="cu-item-titulo">{correoActual}</p>
        </div>
        <div className="cu-acciones"><Link className="btn-primary" to={RUTAS.configuracion}>Listo</Link></div>
      </div>
    );
  }

  if (paso === 'codigo') {
    return (
      <form className="cu-form" onSubmit={confirmar} noValidate>
        <span className="cu-icono-grande"><IconCorreo /></span>
        <h2 className="cu-titulo-grande">Revisa tu correo</h2>
        <p className="cu-texto">
          Enviamos un código de 6 dígitos a <strong style={{ color: 'var(--navy)' }}>{enmascarar(nuevo)}</strong>.
          Escríbelo para continuar. Tu correo actual (<strong style={{ color: 'var(--navy)' }}>{perfil.correo}</strong>) no cambia hasta que lo confirmes.
        </p>
        <CampoCodigo valor={codigo} onChange={setCodigo} />
        <Aviso>{error}</Aviso>
        <button type="submit" className="btn-primary" disabled={cargando || codigo.length !== 6}>
          {cargando ? 'Verificando…' : 'Verificar'}
        </button>

        <div className="cu-centro">
          <p className="cu-texto">¿No te llegó el código?</p>
          {/* Reenviar necesita la contraseña; si se retomó el trámite sin ella, se vuelve al paso anterior. */}
          {clave ? (
            <button type="button" className="cu-btn cu-btn-texto" style={{ margin: '0 auto' }} disabled={espera > 0 || cargando} onClick={pedirCodigo}>
              {espera > 0 ? <span className="cu-reenvio">Reenviar en {minutosYSegundos(espera)}</span> : 'Reenviar código'}
            </button>
          ) : (
            <button type="button" className="cu-btn cu-btn-texto" style={{ margin: '0 auto' }}
              onClick={() => { setPaso('datos'); setError(''); }}>
              Pedir un código nuevo
            </button>
          )}
          {clave && (
            <button type="button" className="cu-btn cu-btn-texto" style={{ margin: '0 auto' }}
              onClick={() => { setPaso('datos'); setError(''); }}>
              Usar otro correo
            </button>
          )}
        </div>

        <div className="cu-nota" style={{ marginTop: 'auto' }}>
          <IconEscudo />
          <span>El código vence en 10 minutos. Nunca lo compartas con nadie, ni siquiera con nosotros.</span>
        </div>
      </form>
    );
  }

  return (
    <form className="cu-form" onSubmit={pedirCodigo} noValidate>
      <div className="cu-tarjeta">
        <p className="cu-item-meta" style={{ fontWeight: 700 }}>Correo actual</p>
        <p className="cu-item-titulo" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{perfil.correo}</p>
      </div>

      <div>
        <label className="label" htmlFor="correo-nuevo">Nuevo correo electrónico</label>
        <div className="cu-campo">
          <span className="cu-campo-icono"><IconCorreo /></span>
          <input id="correo-nuevo" className="input cu-con-icono" type="email" autoComplete="email" placeholder="nuevo@correo.com"
            value={nuevo} onChange={(e) => setNuevo(e.target.value)} required />
        </div>
      </div>

      <CampoClave id="clave-actual" etiqueta="Contraseña actual" placeholder="Para confirmar que eres tú"
        valor={clave} onChange={setClave} ayuda="Te enviaremos un código de 6 dígitos al correo nuevo." />

      <p className="cu-nota" role="note">
        <IconEscudo />
        <span>Hasta que lo verifiques, seguirás entrando con tu correo actual. También avisaremos al correo anterior del cambio.</span>
      </p>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <button type="submit" className="btn-primary" disabled={cargando || !nuevo.trim() || !clave}>
          {cargando ? 'Enviando código…' : 'Enviar código'}
        </button>
      </div>
    </form>
  );
}

export default function CambiarCorreoPage() {
  const { datos, cargando, error } = useCarga(obtenerPerfil);
  return (
    <Pantalla titulo="Cambiar correo">
      {cargando && <p className="cu-cargando">Cargando…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Flujo perfil={datos} />}
    </Pantalla>
  );
}
