import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatearPrecio, useIdioma } from '@/modules/region';
import FormReporte from '../components/FormReporte.jsx';
import HojaEmergencia from '../components/HojaEmergencia.jsx';
import { IconAlerta, IconAtras, IconChat, IconMas, IconReloj } from '../components/Iconos.jsx';
import { detalle, urlArchivo } from '../services/seguimientoService.js';
import { diaCorto, fase, hora, iniciales, nombreDia, primerNombre, rango, servicio, textoAlerta } from '../utils.js';
import { DESDE_APP, useVolver } from '../useVolver.js';
import '../i18n.js';
import '../seguimiento.css';

// Servicios con su propia unidad de cobro; los demás usan "unidad".
const CON_UNIDAD = ['alojamiento', 'domicilio', 'paseo', 'guarderia'];

function edad(meses, t) {
  if (meses === null || meses === undefined) return null;
  if (meses < 12) return t(meses === 1 ? 'seguimiento.edad.mes' : 'seguimiento.edad.meses', { n: meses });
  const anios = Math.floor(meses / 12);
  return t(anios === 1 ? 'seguimiento.edad.anio' : 'seguimiento.edad.anios', { n: anios });
}

// Agrupa los reportes por día, del más reciente al más antiguo.
function porDia(reportes) {
  const grupos = new Map();
  reportes.forEach((r) => grupos.set(r.dia, [...(grupos.get(r.dia) ?? []), r]));
  return [...grupos.entries()];
}

function Dato({ etiqueta, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="sg-dato">
      <dt>{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Página de la reserva: toda su información y, mientras aplica, el seguimiento del mockup 4
// (HU-30 reportes, HU-31 chat y HU-28 emergencia).
export default function SeguimientoPage() {
  const { t, idioma, locale } = useIdioma();
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [verForm, setVerForm] = useState(false);
  const [verEmergencia, setVerEmergencia] = useState(false);

  const cargar = useCallback(() => detalle(id).then(setD).catch((e) => setError(e.message)), [id]);
  useEffect(() => { cargar(); }, [cargar]);
  const cerrarEmergencia = useCallback(() => setVerEmergencia(false), []);

  const volver = useVolver('/reservas');

  if (error) {
    return (
      <main className="sg-pagina">
        <p className="sg-error" role="alert">{error}</p>
        <Link className="sg-enlace" to="/reservas">{t('seguimiento.ir_reservas')}</Link>
      </main>
    );
  }
  if (!d) return <main className="sg-pagina"><p className="sg-sub">{t('seguimiento.cargando')}</p></main>;

  const dinero = (valor, moneda) => formatearPrecio(valor, moneda, idioma);
  const fechaHora = (valor) => new Date(valor).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const { reserva: r, emergencia } = d;
  const otro = r.soy === 'viajero' ? r.cuidador : r.viajero;
  const enCurso = r.fase === 'en_curso';
  const activa = ['en_curso', 'proxima', 'terminada'].includes(r.fase);
  const faltaHoy = enCurso && !d.reporteHoy;
  const diasPasadosSinReporte = d.diasSinReporte.filter((x) => x !== r.hoy);
  const codigoUnidad = CON_UNIDAD.includes(r.servicio) ? r.servicio : 'otro';
  const unidad = t(`seguimiento.${r.unidades === 1 ? 'unidad' : 'unidades'}.${codigoUnidad}`);
  const estado = t(`seguimiento.estado.${r.estado}`);
  const chatExiste = r.fase !== 'inactiva';
  const m = r.mascota;
  const diaDe = t('seguimiento.dia_de', { n: r.diaActual, total: r.totalDias });

  return (
    <main className="sg-pagina">
      <div className="sg-encabezado">
        <button type="button" className="sg-redondo" aria-label={t('seguimiento.volver')} onClick={volver}><IconAtras /></button>
        <h1>{t('seguimiento.titulo', { mascota: m.nombre, nombre: primerNombre(r.cuidador.nombre) })}</h1>
        <span className={`sg-fase sg-fase--${r.fase}`}>{fase(r.fase)}</span>
      </div>

      <section className={`sg-progreso sg-progreso--${r.fase}`}>
        <div className="sg-progreso-cabecera">
          <span className="sg-avatar sg-avatar--redondo sg-progreso-foto">
            {m.foto ? <img src={urlArchivo(m.foto)} alt="" /> : iniciales(m.nombre)}
          </span>
          <div className="sg-progreso-titulo">
            <small>{servicio(r.servicio)} · {rango(r.fechaInicio, r.fechaFin)}</small>
            <strong>{enCurso ? diaDe : estado}</strong>
          </div>
        </div>
        {enCurso && (
          <div className="sg-dias" role="img" aria-label={diaDe}>
            {Array.from({ length: r.totalDias }, (_, i) => (
              <span key={i} className={i < r.diaActual - 1 ? 'sg-dia--hecho' : i === r.diaActual - 1 ? 'sg-dia--hoy' : ''} />
            ))}
          </div>
        )}
        {activa && (
          <p className="sg-progreso-nota">
            <IconReloj width="18" height="18" />{' '}
            {r.soy === 'viajero' ? t('seguimiento.recoges', { mascota: m.nombre }) : t('seguimiento.devuelves')}{' '}
            <strong>{diaCorto(r.fechaFin)}</strong>
          </p>
        )}
        {r.fase === 'pendiente' && r.responderAntes && (
          <p className="sg-progreso-nota">
            <IconReloj width="18" height="18" />{' '}
            {t('seguimiento.debe_responder', { nombre: primerNombre(r.cuidador.nombre), fecha: fechaHora(r.responderAntes) })}
          </p>
        )}
      </section>

      {r.estado === 'rechazada' && r.motivoRechazo && (
        <p className="sg-aviso sg-aviso--rojo">{t('seguimiento.motivo_rechazo', { motivo: r.motivoRechazo })}</p>
      )}

      {chatExiste && (
        <div className="sg-acciones">
          <Link to={`/reservas/${r.id}/chat`} state={DESDE_APP} className="sg-boton-principal">
            <IconChat /> {r.chat.abierto ? t('seguimiento.escribir_a', { nombre: primerNombre(otro.nombre) }) : t('seguimiento.ver_chat')}
            {r.chat.sinLeer > 0 && <span className="sg-insignia">{r.chat.sinLeer}</span>}
          </Link>
          {emergencia.puedeAlertar && (
            <button type="button" className="sg-boton-borde sg-boton-borde--rojo" onClick={() => setVerEmergencia(true)}>
              <IconAlerta width="18" height="18" /> {t('seguimiento.emergencia')}
            </button>
          )}
          {d.puedeReportar && !verForm && (
            <button type="button" className="sg-boton-borde" onClick={() => setVerForm(true)}>
              <IconMas width="18" height="18" /> {t('seguimiento.nuevo_reporte')}
            </button>
          )}
        </div>
      )}

      {faltaHoy && (
        <p className="sg-aviso">
          {r.soy === 'cuidador'
            ? t('seguimiento.falta_hoy_cuidador', { nombre: primerNombre(r.viajero.nombre), mascota: m.nombre })
            : t('seguimiento.falta_hoy_viajero', { nombre: primerNombre(r.cuidador.nombre) })}
        </p>
      )}
      {diasPasadosSinReporte.length > 0 && (
        <p className="sg-aviso sg-aviso--rojo">
          {t('seguimiento.dias_sin_reporte', { dias: diasPasadosSinReporte.map(diaCorto).join(', ') })}
        </p>
      )}

      {verForm && (
        <FormReporte reservaId={r.id} mascota={m.nombre} onCreado={() => { setVerForm(false); cargar(); }} />
      )}

      {activa && (
        <section>
          <h2 className="sg-titulo-seccion">{t('seguimiento.reportes')}</h2>
          {d.reportes.length === 0 && (
            <p className="sg-vacio">{r.fase === 'proxima' ? t('seguimiento.reportes_proxima') : t('seguimiento.sin_reportes')}</p>
          )}
          {porDia(d.reportes).map(([dia, lista]) => (
            <div key={dia} className="sg-dia">
              <h3>{nombreDia(dia, r.hoy)}</h3>
              <ul className="sg-linea">
                {lista.map((x) => (
                  <li key={x.id} className="sg-tarjeta sg-reporte">
                    <div className="sg-reporte-cabecera">
                      <strong>{x.titulo}</strong>
                      <small>{hora(x.creadoEn)}</small>
                    </div>
                    {x.nota && <p>{x.nota}</p>}
                    {x.foto && <img src={urlArchivo(x.foto)} alt={x.titulo} loading="lazy" />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="sg-titulo-seccion">{t('seguimiento.detalles')}</h2>
        <div className="sg-tarjeta">
          <dl className="sg-datos">
            <Dato etiqueta={t('seguimiento.dato.reserva')}>#{r.id}</Dato>
            <Dato etiqueta={t('seguimiento.dato.servicio')}>{servicio(r.servicio)}</Dato>
            <Dato etiqueta={t('seguimiento.dato.fechas')}>{rango(r.fechaInicio, r.fechaFin)}</Dato>
            <Dato etiqueta={t('seguimiento.dato.estado')}>{estado}</Dato>
            <Dato etiqueta={t('seguimiento.dato.solicitada')}>{fechaHora(r.creadaEn)}</Dato>
            {r.respondidaEn && <Dato etiqueta={t('seguimiento.dato.respondida')}>{fechaHora(r.respondidaEn)}</Dato>}
          </dl>
          <div className="sg-precio">
            <div><span>{r.unidades} {unidad} × {dinero(r.tarifa, r.moneda)}</span><span>{dinero(r.tarifa * r.unidades, r.moneda)}</span></div>
            <div className="sg-precio-total"><strong>{t('seguimiento.total')}</strong><strong>{dinero(r.total, r.moneda)}</strong></div>
          </div>
          {r.nota && <p className="sg-nota">“{r.nota}”</p>}
        </div>
      </section>

      <section>
        <h2 className="sg-titulo-seccion">{r.soy === 'viajero' ? t('seguimiento.tu_cuidador') : t('seguimiento.viajero')}</h2>
        <div className="sg-tarjeta sg-persona">
          <span className="sg-avatar sg-avatar--redondo">
            {otro.foto ? <img src={urlArchivo(otro.foto)} alt="" /> : iniciales(otro.nombre)}
          </span>
          <span>
            <strong>{otro.nombre}</strong>
            {r.soy === 'viajero' && <small>{[r.cuidador.barrio, r.cuidador.ciudad].filter(Boolean).join(', ')}</small>}
          </span>
          {r.soy === 'viajero' && (
            <Link className="sg-enlace sg-persona-enlace" to={`/cuidadores/${r.cuidador.id}`} state={{ desdeBusqueda: true }}>
              {t('seguimiento.ver_perfil')}
            </Link>
          )}
        </div>
      </section>

      <section>
        <h2 className="sg-titulo-seccion">{t('seguimiento.mascota')}</h2>
        <div className="sg-tarjeta">
          <div className="sg-persona sg-persona--sin-borde">
            <span className="sg-avatar">{m.foto ? <img src={urlArchivo(m.foto)} alt="" /> : iniciales(m.nombre)}</span>
            <span>
              <strong>{m.nombre}{m.fina ? ` · ${t('seguimiento.fina')}` : ''}</strong>
              <small>
                {[m.especie && t(`seguimiento.especie.${m.especie}`), m.raza, edad(m.edadMeses, t),
                  m.pesoKg ? `${Number(m.pesoKg).toLocaleString(locale)} kg` : null].filter(Boolean).join(' · ')}
              </small>
            </span>
          </div>
          <dl className="sg-datos">
            <Dato etiqueta={t('seguimiento.dato.vacunas')}>{m.vacunas}</Dato>
            <Dato etiqueta={t('seguimiento.dato.microchip')}>{m.microchip}</Dato>
            <Dato etiqueta={t('seguimiento.dato.indicaciones')}>{m.indicaciones}</Dato>
            {emergencia.veterinario && (
              <Dato etiqueta={t('seguimiento.dato.veterinario')}>{emergencia.veterinario.nombre} · {emergencia.veterinario.telefono}</Dato>
            )}
          </dl>
        </div>
      </section>

      {emergencia.alertas.length > 0 && (
        <section>
          <h2 className="sg-titulo-seccion">{t('seguimiento.alertas')}</h2>
          <ul className="sg-alertas">
            {emergencia.alertas.map((a) => (
              <li key={a.id}>
                <IconAlerta width="16" height="16" />
                <span>{textoAlerta(a.mensaje)}<small>{diaCorto(a.creadoEn)} · {hora(a.creadoEn)}</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {verEmergencia && (
        <HojaEmergencia reservaId={r.id} mascota={m.nombre} emergencia={emergencia}
          onCerrar={cerrarEmergencia} onAlerta={() => cargar()} />
      )}
    </main>
  );
}
