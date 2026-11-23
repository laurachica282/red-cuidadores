import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import { traducirMensajeServidor } from '@/shared/api/mensajesServidor.js';
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
  const { t } = useIdioma();
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
    if (validarCorreo(correo)) return setError(t(validarCorreo(correo)));
    setCargando(true);
    try {
      const r = await solicitarReactivacion(correo.trim());
      iniciarEspera(r.reenvio_segundos ?? 60);
      setCodigo('');
      setPaso('codigo');
      setInfo(traducirMensajeServidor(r.mensaje));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError('');
    if (validarCodigo(codigo)) return setError(t(validarCodigo(codigo)));
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
    <Pantalla titulo={t('cuenta.reactivar.titulo')} atras="/login" etiquetaAtras={t('cuenta.reactivar.volverLogin')}>
      {state?.desactivada && paso === 'correo' && (
        <Aviso tipo="ok">{t('cuenta.reactivar.quedoDesactivada')}</Aviso>
      )}

      {paso === 'correo' && (
        <form className="cu-form" onSubmit={pedirCodigo} noValidate>
          <p className="cu-texto">{t('cuenta.reactivar.escribeCorreo')}</p>
          <div>
            <label className="label" htmlFor="correo">{t('cuenta.correoElectronico')}</label>
            <div className="cu-campo">
              <span className="cu-campo-icono"><IconCorreo /></span>
              <input id="correo" className="input cu-con-icono" type="email" autoComplete="email" placeholder={t('cuenta.reactivar.correoPh')}
                value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
          </div>
          <Aviso>{error}</Aviso>
          <button type="submit" className="btn-primary" disabled={cargando || !correo.trim()}>
            {cargando ? t('cuenta.enviando') : t('cuenta.enviarCodigo')}
          </button>
        </form>
      )}

      {paso === 'codigo' && (
        <form className="cu-form" onSubmit={confirmar} noValidate>
          <Aviso tipo="info">{info}</Aviso>
          <CampoCodigo valor={codigo} onChange={setCodigo} />
          <Aviso>{error}</Aviso>
          <button type="submit" className="btn-primary" disabled={cargando || codigo.length !== 6}>
            {cargando ? t('cuenta.reactivar.reactivando') : t('cuenta.reactivar.boton')}
          </button>
          <div className="cu-fila">
            <button type="button" className="cu-btn cu-btn-texto" disabled={espera > 0 || cargando} onClick={pedirCodigo}>
              {espera > 0 ? t('cuenta.reenviarEn', { tiempo: minutosYSegundos(espera) }) : t('cuenta.reenviarCodigo')}
            </button>
            <button type="button" className="cu-btn cu-btn-texto" onClick={() => { setPaso('correo'); setError(''); }}>
              {t('cuenta.usarOtroCorreo')}
            </button>
          </div>
        </form>
      )}

      {paso === 'listo' && (
        <div className="cu-form">
          <Aviso tipo="ok">{traducirMensajeServidor(resultado.mensaje)}</Aviso>
          {resultado.requiere_renovar_antecedentes && (
            <Aviso tipo="info">
              {t('cuenta.reactivar.antecedentes')}
            </Aviso>
          )}
          <Link className="btn-primary" to="/login">{t('cuenta.reactivar.iniciarSesion')}</Link>
        </div>
      )}
    </Pantalla>
  );
}
