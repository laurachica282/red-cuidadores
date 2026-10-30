import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import CampoCodigo from '../components/CampoCodigo.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCuentaRegresiva } from '../hooks/useCuentaRegresiva.js';
import { confirmarReactivacion, solicitarReactivacion } from '../services/cuentaService.js';
import { minutosYSegundos } from '../utils/textos.js';
import { validarCodigo, validarCorreo } from '../utils/validaciones.js';

// HU-40: pública (una cuenta desactivada no puede iniciar sesión). Verifica la identidad con
// un código enviado al correo. Una cuenta suspendida por un administrador no se reactiva aquí.
export default function ReactivarCuentaPage() {
  const { state } = useLocation();
  const { cerrarSesion } = useAuth();

  // Si el usuario llega justo después de desactivar su cuenta, su sesión local ya no sirve.
  useEffect(() => {
    if (state?.desactivada) cerrarSesion();
  }, []); // eslint-disable-line
  const [paso, setPaso] = useState('correo');
  const [correo, setCorreo] = useState(state?.correo ?? '');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [espera, iniciarEspera] = useCuentaRegresiva();

  const pedirCodigo = async (e) => {
    e?.preventDefault();
    setError('');
    if (validarCorreo(correo)) return setError(validarCorreo(correo));
    setCargando(true);
    try {
      const r = await solicitarReactivacion(correo.trim());
      iniciarEspera(r.reenvio_segundos ?? 60);
      setCodigo('');
      setPaso('codigo');
      setInfo(r.mensaje);
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
      setResultado(await confirmarReactivacion(correo.trim(), codigo));
      setPaso('listo');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla titulo="Reactivar cuenta" atras="/login" etiquetaAtras="Volver al inicio de sesión">
      {state?.desactivada && paso === 'correo' && (
        <Aviso tipo="ok">Tu cuenta quedó desactivada. Tus datos se conservan; si quieres volver, reactívala aquí.</Aviso>
      )}

      {paso === 'correo' && (
        <form className="cu-form" onSubmit={pedirCodigo} noValidate>
          <p className="cu-texto">Escribe el correo de tu cuenta y te enviaremos un código para confirmar que eres tú.</p>
          <div>
            <label className="label" htmlFor="correo">Correo electrónico</label>
            <div className="cu-campo">
              <span className="cu-campo-icono"><IconCorreo /></span>
              <input id="correo" className="input cu-con-icono" type="email" autoComplete="email" placeholder="nombre@correo.com"
                value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>
          <Aviso>{error}</Aviso>
          <button type="submit" className="btn-primary" disabled={cargando || !correo.trim()}>
            {cargando ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      )}

      {paso === 'codigo' && (
        <form className="cu-form" onSubmit={confirmar} noValidate>
          <Aviso tipo="info">{info}</Aviso>
          <CampoCodigo valor={codigo} onChange={setCodigo} />
          <Aviso>{error}</Aviso>
          <button type="submit" className="btn-primary" disabled={cargando || codigo.length !== 6}>
            {cargando ? 'Reactivando…' : 'Reactivar mi cuenta'}
          </button>
          <div className="cu-fila">
            <button type="button" className="cu-btn cu-btn-texto" disabled={espera > 0 || cargando} onClick={pedirCodigo}>
              {espera > 0 ? `Reenviar en ${minutosYSegundos(espera)}` : 'Reenviar código'}
            </button>
            <button type="button" className="cu-btn cu-btn-texto" onClick={() => { setPaso('correo'); setError(''); }}>
              Usar otro correo
            </button>
          </div>
        </form>
      )}

      {paso === 'listo' && (
        <div className="cu-form">
          <Aviso tipo="ok">{resultado.mensaje}</Aviso>
          {resultado.requiere_renovar_antecedentes && (
            <Aviso tipo="info">
              Tus antecedentes están vencidos. Renuévalos desde tu perfil de cuidador para volver a aparecer en la búsqueda.
            </Aviso>
          )}
          <Link className="btn-primary" to="/login">Iniciar sesión</Link>
        </div>
      )}
    </Pantalla>
  );
}
