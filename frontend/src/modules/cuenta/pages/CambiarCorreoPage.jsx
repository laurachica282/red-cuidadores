import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
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

// Arma un texto traducido con {marcas} reemplazadas por elementos (por ejemplo, correos en negrita).
function conMarcas(texto, valores) {
  return texto.split(/\{(\w+)\}/).map((parte, i) => (i % 2 ? <span key={i}>{valores[parte]}</span> : parte));
}

// HU-06 (mockups 14 y 9): pide la clave, manda un código al correo NUEVO y avisa al anterior.
// El correo no cambia hasta confirmar el código.
function Flujo({ perfil }) {
  const { t } = useIdioma();
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
    if (validarCorreo(nuevo)) return setError(t(validarCorreo(nuevo)));
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
    if (validarCodigo(codigo)) return setError(t(validarCodigo(codigo)));
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
        <Aviso tipo="ok">{t('cuenta.correo.actualizado')}</Aviso>
        <div className="cu-tarjeta cu-tarjeta-suave">
          <p className="cu-item-meta">{t('cuenta.correo.ahoraEs')}</p>
          <p className="cu-item-titulo">{correoActual}</p>
        </div>
        <div className="cu-acciones"><Link className="btn-primary" to={RUTAS.configuracion}>{t('cuenta.correo.listo')}</Link></div>
      </div>
    );
  }

  if (paso === 'codigo') {
    return (
      <form className="cu-form" onSubmit={confirmar} noValidate>
        <span className="cu-icono-grande"><IconCorreo /></span>
        <h2 className="cu-titulo-grande">{t('cuenta.correo.revisa')}</h2>
        <p className="cu-texto">
          {conMarcas(t('cuenta.correo.enviado', { nuevo: '{nuevo}', actual: '{actual}' }), {
            nuevo: <strong style={{ color: 'var(--navy)' }}>{enmascarar(nuevo)}</strong>,
            actual: <strong style={{ color: 'var(--navy)' }}>{perfil.correo}</strong>,
          })}
        </p>
        <CampoCodigo valor={codigo} onChange={setCodigo} />
        <Aviso>{error}</Aviso>
        <button type="submit" className="btn-primary" disabled={cargando || codigo.length !== 6}>
          {cargando ? t('cuenta.correo.verificando') : t('cuenta.correo.verificar')}
        </button>

        <div className="cu-centro">
          <p className="cu-texto">{t('cuenta.correo.noLlego')}</p>
          {/* Reenviar necesita la contraseña; si se retomó el trámite sin ella, se vuelve al paso anterior. */}
          {clave ? (
            <button type="button" className="cu-btn cu-btn-texto" style={{ margin: '0 auto' }} disabled={espera > 0 || cargando} onClick={pedirCodigo}>
              {espera > 0 ? <span className="cu-reenvio">{t('cuenta.reenviarEn', { tiempo: minutosYSegundos(espera) })}</span> : t('cuenta.reenviarCodigo')}
            </button>
          ) : (
            <button type="button" className="cu-btn cu-btn-texto" style={{ margin: '0 auto' }}
              onClick={() => { setPaso('datos'); setError(''); }}>
              {t('cuenta.correo.pedirNuevo')}
            </button>
          )}
          {clave && (
            <button type="button" className="cu-btn cu-btn-texto" style={{ margin: '0 auto' }}
              onClick={() => { setPaso('datos'); setError(''); }}>
              {t('cuenta.usarOtroCorreo')}
            </button>
          )}
        </div>

        <div className="cu-nota" style={{ marginTop: 'auto' }}>
          <IconEscudo />
          <span>{t('cuenta.correo.vence')}</span>
        </div>
      </form>
    );
  }

  return (
    <form className="cu-form" onSubmit={pedirCodigo} noValidate>
      <div className="cu-tarjeta">
        <p className="cu-item-meta" style={{ fontWeight: 700 }}>{t('cuenta.correo.actual')}</p>
        <p className="cu-item-titulo" style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{perfil.correo}</p>
      </div>

      <div>
        <label className="label" htmlFor="correo-nuevo">{t('cuenta.correo.nuevo')}</label>
        <div className="cu-campo">
          <span className="cu-campo-icono"><IconCorreo /></span>
          <input id="correo-nuevo" className="input cu-con-icono" type="email" autoComplete="email" placeholder={t('cuenta.correo.nuevoPh')}
            value={nuevo} onChange={(e) => setNuevo(e.target.value)} required />
        </div>
      </div>

      <CampoClave id="clave-actual" etiqueta={t('cuenta.correo.claveActual')} placeholder={t('cuenta.correo.claveActualPh')}
        valor={clave} onChange={setClave} ayuda={t('cuenta.correo.claveAyuda')} />

      <p className="cu-nota" role="note">
        <IconEscudo />
        <span>{t('cuenta.correo.nota')}</span>
      </p>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <button type="submit" className="btn-primary" disabled={cargando || !nuevo.trim() || !clave}>
          {cargando ? t('cuenta.correo.enviandoCodigo') : t('cuenta.enviarCodigo')}
        </button>
      </div>
    </form>
  );
}

export default function CambiarCorreoPage() {
  const { t } = useIdioma();
  const { datos, cargando, error } = useCarga(obtenerPerfil);
  return (
    <Pantalla titulo={t('cuenta.correo.titulo')}>
      {cargando && <p className="cu-cargando">{t('cuenta.cargando')}</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Flujo perfil={datos} />}
    </Pantalla>
  );
}
