import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import { cancelacionesAdmin, revisarCancelacion } from '../services/reservasService.js';
import { cuandoReserva, fechaHora, nombreServicio, nombresMascotas, precio, textoMotivoCuidador } from '../utils.js';
import '../i18n.js';
import './reservas.css';

const iniciales = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('');
// Multa sugerida: el 10 % del total de la reserva.
const sugerida = (total) => String(Math.round(Number(total) * 0.1));

// Una cancelación por revisar: sin multa, o con multa (monto editable) y una nota opcional.
function Revision({ c, ocupado, onDecidir }) {
  const { t } = useIdioma();
  const [conMulta, setConMulta] = useState(false);
  const [multa, setMulta] = useState(sugerida(c.total));
  const [nota, setNota] = useState('');
  const moneda = c.moneda.trim();

  if (!conMulta) {
    return (
      <div className="rs-acciones rs-acciones--fila">
        <button type="button" className="rs-boton-claro" disabled={ocupado}
          onClick={() => onDecidir({ decision: 'sin_multa', nota })}>
          {t('reservas.admin.sin_multa')}
        </button>
        <button type="button" className="btn-primary rs-boton-peligro" disabled={ocupado} onClick={() => setConMulta(true)}>
          {t('reservas.admin.aplicar_multa')}
        </button>
      </div>
    );
  }
  return (
    <div className="rs-cancelar">
      <div className="rs-form-chico">
        <div>
          <label className="label" htmlFor={`multa-${c.id}`}>{t('reservas.admin.monto_multa', { moneda })}</label>
          <input id={`multa-${c.id}`} className="input" inputMode="decimal" value={multa}
            onChange={(e) => setMulta(e.target.value.replace(/[^\d.]/g, ''))} />
          <small className="rs-ayuda">
            {t('reservas.admin.multa_ayuda', { sugerida: precio(sugerida(c.total), moneda), maximo: precio(c.total, moneda) })}
          </small>
        </div>
        <div>
          <label className="label" htmlFor={`nota-${c.id}`}>{t('reservas.admin.nota')}</label>
          <textarea id={`nota-${c.id}`} className="input rs-nota" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </div>
      <div className="rs-acciones rs-acciones--fila">
        <button type="button" className="rs-boton-claro" onClick={() => setConMulta(false)}>{t('reservas.volver')}</button>
        <button type="button" className="btn-primary rs-boton-peligro" disabled={ocupado}
          onClick={() => onDecidir({ decision: 'con_multa', multa: Number(multa), nota })}>
          {t('reservas.admin.confirmar_multa', { multa: precio(Number(multa) || 0, moneda) })}
        </button>
      </div>
    </div>
  );
}

// Administración: cancelaciones que hicieron los cuidadores sobre reservas ya aceptadas.
export default function AdminCancelacionesPage() {
  const { usuario } = useAuth();
  const { t } = useIdioma();
  const esAdmin = usuario?.rol === 'admin';
  const [pestana, setPestana] = useState('en_revision');
  const [listas, setListas] = useState({ en_revision: [], revisadas: [] });
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const pedir = () => Promise.all([cancelacionesAdmin('en_revision'), cancelacionesAdmin('revisadas')]);
  const cargar = useCallback(async () => {
    const [p, r] = await pedir();
    setListas({ en_revision: p, revisadas: r });
  }, []);

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vivo = true;
    pedir()
      .then(([p, r]) => vivo && setListas({ en_revision: p, revisadas: r }))
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [esAdmin]);

  async function decidir(c, datos) {
    setError('');
    setAviso('');
    if (datos.decision === 'con_multa' && !(datos.multa > 0 && datos.multa <= Number(c.total))) {
      setError(t('reservas.admin.multa_invalida', { maximo: precio(c.total, c.moneda.trim()) }));
      return;
    }
    setOcupado(true);
    try {
      await revisarCancelacion(c.id, datos);
      setAviso(datos.decision === 'con_multa' ? t('reservas.admin.multa_ok') : t('reservas.admin.sin_multa_ok'));
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!esAdmin) {
    return <main className="rs-pagina"><p className="rs-aviso">{t('reservas.admin.solo_admin')}</p></main>;
  }

  const lista = listas[pestana];
  return (
    <main className="rs-pagina rs-pagina--ancha">
      <h1 className="rs-titulo">{t('reservas.admin.titulo')}</h1>
      <p className="rs-texto">{t('reservas.admin.sub')}</p>

      <div className="rs-segmentos rs-segmentos--dos" role="tablist">
        {['en_revision', 'revisadas'].map((id) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id}
            className={`rs-segmento${pestana === id ? ' rs-segmento--activo' : ''}`} onClick={() => setPestana(id)}>
            {t(`reservas.admin.tab_${id}`)} <span>{listas[id].length}</span>
          </button>
        ))}
      </div>

      {aviso && <p className="rs-aviso rs-aviso--ok" role="status">{aviso}</p>}
      {error && <p className="rs-aviso rs-aviso--error" role="alert">{error}</p>}
      {cargando && <p className="rs-texto">{t('reservas.cargando')}</p>}
      {!cargando && lista.length === 0 && (
        <p className="rs-vacio-lista">{t(pestana === 'en_revision' ? 'reservas.admin.sin_pendientes' : 'reservas.admin.sin_revisadas')}</p>
      )}

      <ul className="rs-lista">
        {lista.map((c) => {
          const moneda = c.moneda.trim();
          return (
            <li key={c.id} className="rs-tarjeta rs-admin">
              <header className="rs-admin-cab">
                <span className="rs-avatar">{iniciales(c.cuidador)}</span>
                <div>
                  <strong>{c.cuidador}</strong>
                  <small>{c.cuidador_correo}</small>
                  <small>{t('reservas.admin.creada', { fecha: fechaHora(c.creado_en) })}</small>
                </div>
                {c.estado !== 'en_revision' && (
                  <span className={`rs-estado ${c.estado === 'con_multa' ? 'rs-estado--cancelada' : ''}`}>
                    {c.estado === 'con_multa' ? t('reservas.admin.estado_multa', { multa: precio(c.multa, moneda) }) : t('reservas.admin.estado_sin_multa')}
                  </span>
                )}
              </header>
              <p className="rs-texto">
                <strong>{nombreServicio(c.servicio)}</strong> · {cuandoReserva(c)} · {precio(c.total, moneda)}
              </p>
              <p className="rs-texto">
                {t('reservas.viajero', { nombre: c.viajero })} · {t((c.mascotas?.length ?? 1) > 1 ? 'reservas.mascotas' : 'reservas.mascota', { nombre: nombresMascotas(c) })}
              </p>
              <p className="rs-texto"><strong>{t('reservas.motivo', { motivo: textoMotivoCuidador(c.motivo) })}</strong></p>
              <p className="rs-texto rs-cita">“{c.detalle}”</p>
              {c.estado === 'en_revision' ? (
                <Revision c={c} ocupado={ocupado} onDecidir={(datos) => decidir(c, datos)} />
              ) : (
                <>
                  <p className="rs-texto">
                    {t('reservas.admin.revisada', { quien: c.revisado_por ?? '—', fecha: fechaHora(c.revisado_en) })}
                    {c.estado === 'con_multa' && (
                      <> · {c.descontada_en
                        ? t('reservas.admin.descontada', { fecha: fechaHora(c.descontada_en) })
                        : t('reservas.admin.por_descontar')}</>
                    )}
                  </p>
                  {c.nota_admin && <p className="rs-texto">{t('reservas.admin.nota_texto', { nota: c.nota_admin })}</p>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
