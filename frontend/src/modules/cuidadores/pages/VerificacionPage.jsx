import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import EstadoVerificacion from '../components/EstadoVerificacion.jsx';
import { IconCandadoArchivo, IconCheck, IconDocumento, IconCamara } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { enviarVerificacion, obtenerVerificacion } from '../services/cuidadoresService.js';

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENTOS = [...IMAGENES, 'application/pdf'];

function CampoArchivo({ id, etiqueta, ayuda, icono, archivo, aceptar, camara, onElegir }) {
  const { t } = useIdioma();
  return (
    <div>
      <span className="label">{etiqueta}</span>
      <label htmlFor={id} className={`cd-archivo${archivo ? ' cd-archivo-listo' : ''}`}>
        <span className="cd-archivo-icono">{archivo ? <IconCheck /> : icono}</span>
        <span className="cd-archivo-texto">
          <strong>{archivo ? archivo.name : t('verif.elegir')}</strong>
          <small>{ayuda}</small>
        </span>
        {archivo && <span className="cd-archivo-cambiar">{t('verif.cambiar')}</span>}
        <input id={id} type="file" accept={aceptar} capture={camara ? 'user' : undefined} onChange={(e) => onElegir(e.target.files[0] ?? null)} />
      </label>
    </div>
  );
}

// HU-11: el cuidador sube documento, selfie y certificado de antecedentes.
export default function VerificacionPage() {
  const { t } = useIdioma();
  const [verificacion, setVerificacion] = useState(null);
  const [documento, setDocumento] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [antecedentes, setAntecedentes] = useState(null);
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    obtenerVerificacion().then((d) => vivo && setVerificacion(d)).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  const valido = (f, permitidos) => f && permitidos.includes(f.type) && f.size <= MAX_BYTES;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!documento || !selfie || !antecedentes || !acepto) return setError(t('verif.faltan'));
    if (!valido(documento, DOCUMENTOS) || !valido(selfie, IMAGENES) || !valido(antecedentes, DOCUMENTOS)) {
      return setError(t('verif.archivo_invalido'));
    }
    setEnviando(true);
    try {
      await enviarVerificacion({ documento, selfie, antecedentes });
      setEnviado(true);
      setVerificacion(await obtenerVerificacion());
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar = verificacion && ['sin_enviar', 'rechazado', 'vencido'].includes(verificacion.estado) && !enviado;

  return (
    <Pantalla titulo={t('verif.titulo')} sub={t('verif.sub')} atras="/cuidador" pie={puedeEnviar && (
      <button type="submit" form="verif-form" className="btn-primary" disabled={enviando}>
        {enviando ? t('comun.enviando') : t('verif.enviar')}
      </button>
    )}>
      {!verificacion && !error && <p className="cd-sub">{t('comun.cargando')}</p>}
      {verificacion && <EstadoVerificacion verificacion={verificacion} />}
      {enviado && <p className="cd-exito" role="status">{t('verif.enviada')}</p>}

      {puedeEnviar && (
        <form id="verif-form" className="cd-form" onSubmit={enviar}>
          <CampoArchivo id="documento" etiqueta={t('verif.documento')} ayuda={t('verif.documento_ayuda')}
            icono={<IconDocumento />} archivo={documento} aceptar="image/jpeg,image/png,image/webp,application/pdf" onElegir={setDocumento} />
          <CampoArchivo id="selfie" etiqueta={t('verif.selfie')} ayuda={t('verif.selfie_ayuda')}
            icono={<IconCamara />} archivo={selfie} aceptar="image/jpeg,image/png,image/webp" camara onElegir={setSelfie} />
          <CampoArchivo id="antecedentes" etiqueta={t('verif.antecedentes')} ayuda={t('verif.antecedentes_ayuda')}
            icono={<IconDocumento />} archivo={antecedentes} aceptar="image/jpeg,image/png,image/webp,application/pdf" onElegir={setAntecedentes} />

          <label className="cd-check">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
            <span>{t('verif.acepto')} <Link className="cd-enlace-inline" to="/terminos">{t('verif.ver_terminos')}</Link></span>
          </label>

          <p className="cd-ayuda"><IconCandadoArchivo style={{ verticalAlign: '-3px' }} /> {t('verif.cifrado')}</p>

          {error && <p className="cd-error" role="alert">{error}</p>}

        </form>
      )}
      {!puedeEnviar && error && <p className="cd-error" role="alert">{error}</p>}
    </Pantalla>
  );
}
