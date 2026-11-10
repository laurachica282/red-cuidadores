import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { alertar } from '../services/seguimientoService.js';
import { DESDE_APP } from '../useVolver.js';
import { IconAlerta, IconCerrar, IconCheck, IconTelefono } from './Iconos.jsx';

const MOTIVOS = ['No quiere comer', 'Está herida o enferma', 'Se perdió', 'No me responden', 'Otro problema'];

const llamar = (telefono) => `tel:${String(telefono).replace(/[^\d+]/g, '')}`;

function Veterinario({ v }) {
  if (!v) return <p className="sg-sub">No hay veterinario registrado para esta mascota.</p>;
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
      const r = await alertar(reservaId, [motivo, detalle.trim()].filter(Boolean).join('. '));
      setResultado(r);
      onAlerta(r.alerta);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="sg-capa">
      <button type="button" className="sg-capa-fondo" aria-label="Cerrar" onClick={onCerrar} />
      <div className="sg-hoja" role="dialog" aria-modal="true" aria-labelledby="sg-emergencia-titulo">
        <div className="sg-hoja-cabecera">
          <h2 id="sg-emergencia-titulo">{resultado ? 'Aviso enviado' : 'Reportar un problema'}</h2>
          <button type="button" className="sg-redondo sg-redondo--chico" aria-label="Cerrar" onClick={onCerrar}><IconCerrar /></button>
        </div>

        <div className="sg-hoja-cuerpo">
          {resultado ? (
            <div className="sg-exito">
              <span className="sg-exito-icono"><IconCheck width="28" height="28" /></span>
              <p>
                Avisamos a soporte
                {resultado.alerta.avisadoContacto && resultado.contacto ? ` y a ${resultado.contacto.nombre}` : ''}.
                Te contactaremos lo antes posible.
              </p>
            </div>
          ) : (
            <>
              <p className="sg-aviso-rojo"><IconAlerta width="18" height="18" /> Si {mascota} corre peligro, llama primero al veterinario.</p>
              <h3>¿Qué está pasando?</h3>
              <div className="sg-sugerencias">
                {MOTIVOS.map((m) => (
                  <button key={m} type="button" className={`sg-chip${motivo === m ? ' sg-chip--activo' : ''}`} onClick={() => setMotivo(m)}>{m}</button>
                ))}
              </div>
              <textarea className="input sg-textarea" rows={3} maxLength={400} placeholder="Cuéntanos más (opcional)"
                value={detalle} onChange={(e) => setDetalle(e.target.value)} aria-label="Detalle" />

              <h3>Avisaremos a</h3>
              <ul className="sg-avisados">
                <li><IconCheck width="16" height="16" /> Soporte de Red de Cuidadores</li>
                <li>
                  {contacto ? (
                    <>
                      <IconCheck width="16" height="16" /> {contacto.nombre}{contacto.parentesco ? ` (${contacto.parentesco})` : ''}
                      <Link className="sg-editar" to="/emergencia" state={DESDE_APP}>Cambiar</Link>
                    </>
                  ) : (
                    <span className="sg-sub">
                      No tienes contacto de emergencia. <Link to="/emergencia" state={DESDE_APP}>Agregar uno</Link>
                    </span>
                  )}
                </li>
              </ul>
            </>
          )}

          <h3>Veterinario de {mascota}</h3>
          <Veterinario v={resultado?.veterinario ?? veterinario} />
          {error && <p className="sg-error" role="alert">{error}</p>}
        </div>

        <div className="sg-hoja-acciones">
          {resultado ? (
            <button type="button" className="btn-primary" onClick={onCerrar}>Listo</button>
          ) : (
            <button type="button" className="sg-boton-peligro" disabled={enviando || (!motivo && !detalle.trim())} onClick={enviar}>
              <IconAlerta width="20" height="20" /> {enviando ? 'Enviando…' : 'Enviar aviso de emergencia'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
