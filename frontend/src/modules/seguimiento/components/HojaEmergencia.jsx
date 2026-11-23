import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { alertar } from '../services/seguimientoService.js';
import { DESDE_APP } from '../useVolver.js';
import { MOTIVOS } from '../utils.js';
import { IconAlerta, IconCerrar, IconCheck, IconTelefono } from './Iconos.jsx';
import '../i18n.js';

const llamar = (telefono) => `tel:${String(telefono).replace(/[^\d+]/g, '')}`;

function Veterinario({ v }) {
  const { t } = useIdioma();
  if (!v) return <p className="sg-sub">{t('seguimiento.emerg.sin_veterinario')}</p>;
  return (
    <div className="sg-contacto">
      <div>
        <strong>{v.nombre}</strong>
        <small>{[v.clinica, v.direccion].filter(Boolean).join(' · ')}</small>
      </div>
      <a className="sg-llamar" href={llamar(v.telefono)}><IconTelefono width="18" height="18" /> {v.telefono}</a>
    </div>
  );
}

// HU-28: avisa al contacto de emergencia y a soporte, y muestra el veterinario registrado.
export default function HojaEmergencia({ reservaId, mascota, emergencia, onCerrar, onAlerta }) {
  const { t } = useIdioma();
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const { contacto, veterinario } = emergencia;

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  async function enviar() {
    setError('');
    setEnviando(true);
    try {
      const textoMotivo = motivo ? t(`seguimiento.emerg.motivo.${motivo}`) : '';
      const r = await alertar(reservaId, [textoMotivo, detalle.trim()].filter(Boolean).join('. '));
      setResultado(r);
      onAlerta(r.alerta);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const avisados = resultado?.alerta.avisadoContacto && resultado.contacto
    ? t('seguimiento.emerg.avisamos_y', { nombre: resultado.contacto.nombre })
    : t('seguimiento.emerg.avisamos');

  return (
    <div className="sg-capa">
      <button type="button" className="sg-capa-fondo" aria-label={t('seguimiento.cerrar')} onClick={onCerrar} />
      <div className="sg-hoja" role="dialog" aria-modal="true" aria-labelledby="sg-emergencia-titulo">
        <div className="sg-hoja-cabecera">
          <h2 id="sg-emergencia-titulo">{resultado ? t('seguimiento.emerg.aviso_enviado') : t('seguimiento.emerg.reportar')}</h2>
          <button type="button" className="sg-redondo sg-redondo--chico" aria-label={t('seguimiento.cerrar')} onClick={onCerrar}><IconCerrar /></button>
        </div>

        <div className="sg-hoja-cuerpo">
          {resultado ? (
            <div className="sg-exito">
              <span className="sg-exito-icono"><IconCheck width="28" height="28" /></span>
              <p>{avisados} {t('seguimiento.emerg.contactaremos')}</p>
            </div>
          ) : (
            <>
              <p className="sg-aviso-rojo"><IconAlerta width="18" height="18" /> {t('seguimiento.emerg.peligro', { mascota })}</p>
              <h3>{t('seguimiento.emerg.que_pasa')}</h3>
              <div className="sg-sugerencias">
                {MOTIVOS.map((m) => (
                  <button key={m} type="button" className={`sg-chip${motivo === m ? ' sg-chip--activo' : ''}`} onClick={() => setMotivo(m)}>
                    {t(`seguimiento.emerg.motivo.${m}`)}
                  </button>
                ))}
              </div>
              <textarea className="input sg-textarea" rows={3} maxLength={400} placeholder={t('seguimiento.emerg.detalle_ejemplo')}
                value={detalle} onChange={(e) => setDetalle(e.target.value)} aria-label={t('seguimiento.emerg.detalle_aria')} />

              <h3>{t('seguimiento.emerg.avisaremos')}</h3>
              <ul className="sg-avisados">
                <li><IconCheck width="16" height="16" /> {t('seguimiento.emerg.soporte')}</li>
                <li>
                  {contacto ? (
                    <>
                      <IconCheck width="16" height="16" /> {contacto.nombre}{contacto.parentesco ? ` (${contacto.parentesco})` : ''}
                      <Link className="sg-editar" to="/emergencia" state={DESDE_APP}>{t('seguimiento.emerg.cambiar')}</Link>
                    </>
                  ) : (
                    <span className="sg-sub">
                      {t('seguimiento.emerg.sin_contacto')} <Link to="/emergencia" state={DESDE_APP}>{t('seguimiento.emerg.agregar_uno')}</Link>
                    </span>
                  )}
                </li>
              </ul>
            </>
          )}

          <h3>{t('seguimiento.emerg.veterinario_de', { mascota })}</h3>
          <Veterinario v={resultado?.veterinario ?? veterinario} />
          {error && <p className="sg-error" role="alert">{error}</p>}
        </div>

        <div className="sg-hoja-acciones">
          {resultado ? (
            <button type="button" className="btn-primary" onClick={onCerrar}>{t('seguimiento.emerg.listo')}</button>
          ) : (
            <button type="button" className="sg-boton-peligro" disabled={enviando || (!motivo && !detalle.trim())} onClick={enviar}>
              <IconAlerta width="20" height="20" /> {enviando ? t('seguimiento.emerg.enviando') : t('seguimiento.emerg.enviar')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
