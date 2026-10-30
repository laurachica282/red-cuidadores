import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import CampoClave from '../components/CampoClave.jsx';
import CampoCodigo from '../components/CampoCodigo.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { useCuentaRegresiva } from '../hooks/useCuentaRegresiva.js';
import {
  confirmarCambioCorreo, obtenerPerfil, solicitarCambioCorreo, sincronizarSesion,
} from '../services/cuentaService.js';
import { validarCodigo, validarCorreo } from '../utils/validaciones.js';

// HU-06: pide la clave, manda un código al correo NUEVO y avisa al anterior.
// El correo no cambia hasta confirmar el código.
function Flujo({ perfil }) {
  const pendiente = perfil.cambio_correo_pendiente;
  const [paso, setPaso] = useState(pendiente ? 'codigo' : 'datos');
  const [nuevo, setNuevo] = useState(pendiente?.correo_nuevo ?? '');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(pendiente ? 'Tienes un cambio de correo a medias. Escribe el código que te enviamos o pide uno nuevo.' : '');
  const [cargando, setCargando] = useState(false);
  const [correoActual, setCorreoActual] = useState(perfil.correo);
  const [espera, iniciarEspera] = useCuentaRegresiva();

  const pedirCodigo = async (e) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    if (validarCorreo(nuevo)) return setError(validarCorreo(nuevo));
    setCargando(true);
    try {
      const r = await solicitarCambioCorreo(nuevo.trim(), clave);
      iniciarEspera(r.reenvio_segundos ?? 60);
      setCodigo('');
      setPaso('codigo');
      setInfo(`Enviamos un código de 6 dígitos a ${nuevo.trim()}. Vence en 10 minutos.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
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
        <Link className="btn-primary" to="/cuenta">Volver a mi cuenta</Link>
      </div>
    );
  }

  if (paso === 'codigo') {
    return (
      <form className="cu-form" onSubmit={confirmar} noValidate>
        <p className="cu-texto">
          Tu correo actual (<strong>{perfil.correo}</strong>) no cambia hasta que confirmes el código.
        </p>
        <Aviso tipo="info">{info}</Aviso>
        <CampoCodigo valor={codigo} onChange={setCodigo} />
        <Aviso>{error}</Aviso>
        <button type="submit" className="btn-primary" disabled={cargando || codigo.length !== 6}>
          {cargando ? 'Confirmando…' : 'Confirmar correo'}
        </button>
        <div className="cu-fila">
          {/* Reenviar necesita la contraseña; si se retomó el trámite sin ella, se vuelve al paso anterior. */}
          {clave && (
            <button type="button" className="cu-btn cu-btn-texto" disabled={espera > 0 || cargando} onClick={pedirCodigo}>
              {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar código'}
            </button>
          )}
          <button type="button" className="cu-btn cu-btn-texto" onClick={() => { setPaso('datos'); setError(''); setInfo(''); }}>
            {clave ? 'Usar otro correo' : 'Pedir un código nuevo'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="cu-form" onSubmit={pedirCodigo} noValidate>
      <p className="cu-texto">
        Te enviaremos un código al correo nuevo y un aviso a <strong>{perfil.correo}</strong>.
      </p>
      <div>
        <label className="label" htmlFor="correo-nuevo">Correo nuevo</label>
        <div className="cu-campo">
          <span className="cu-campo-icono"><IconCorreo /></span>
          <input id="correo-nuevo" className="input cu-con-icono" type="email" autoComplete="email" placeholder="nuevo@correo.com"
            value={nuevo} onChange={(e) => setNuevo(e.target.value)} required />
        </div>
      </div>
      <CampoClave id="clave-actual" etiqueta="Tu contraseña actual" valor={clave} onChange={setClave}
        ayuda="La pedimos para confirmar que eres tú." />
      <Aviso>{error}</Aviso>
      <button type="submit" className="btn-primary" disabled={cargando || !nuevo.trim() || !clave}>
        {cargando ? 'Enviando código…' : 'Enviar código'}
      </button>
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
