import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FormReporte from '../components/FormReporte.jsx';
import HojaEmergencia from '../components/HojaEmergencia.jsx';
import { IconAlerta, IconAtras, IconChat, IconMas, IconReloj } from '../components/Iconos.jsx';
import { detalle, urlArchivo } from '../services/seguimientoService.js';
import { FASES, SERVICIOS, diaCorto, hora, iniciales, nombreDia, primerNombre, rango } from '../utils.js';
import { DESDE_APP, useVolver } from '../useVolver.js';
import '../seguimiento.css';

const UNIDADES = { alojamiento: ['noche', 'noches'], domicilio: ['visita', 'visitas'], paseo: ['paseo', 'paseos'], guarderia: ['día', 'días'] };
const ESTADOS = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', rechazada: 'Rechazada', vencida: 'Vencida',
  cancelada: 'Cancelada', en_curso: 'En curso', completada: 'Completada',
};

const dinero = (valor, moneda) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(valor);
const fechaHora = (t) => new Date(t).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function edad(meses) {
  if (meses === null || meses === undefined) return null;
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const anios = Math.floor(meses / 12);
  return `${anios} ${anios === 1 ? 'año' : 'años'}`;
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
        <Link className="sg-enlace" to="/reservas">Ir a mis reservas</Link>
      </main>
    );
  }
  if (!d) return <main className="sg-pagina"><p className="sg-sub">Cargando…</p></main>;

  const { reserva: r, emergencia } = d;
  const otro = r.soy === 'viajero' ? r.cuidador : r.viajero;
  const enCurso = r.fase === 'en_curso';
  const activa = ['en_curso', 'proxima', 'terminada'].includes(r.fase);
  const faltaHoy = enCurso && !d.reporteHoy;
  const diasPasadosSinReporte = d.diasSinReporte.filter((x) => x !== r.hoy);
  const [uno, varios] = UNIDADES[r.servicio] ?? ['unidad', 'unidades'];
  const chatExiste = r.fase !== 'inactiva';
  const m = r.mascota;

  return (
    <main className="sg-pagina">
      <div className="sg-encabezado">
        <button type="button" className="sg-redondo" aria-label="Volver" onClick={volver}><IconAtras /></button>
        <h1>{m.nombre} con {primerNombre(r.cuidador.nombre)}</h1>
        <span className={`sg-fase sg-fase--${r.fase}`}>{FASES[r.fase].texto}</span>
      </div>

      <section className={`sg-progreso sg-progreso--${r.fase}`}>
        <div className="sg-progreso-cabecera">
          <span className="sg-avatar sg-avatar--redondo sg-progreso-foto">
            {m.foto ? <img src={urlArchivo(m.foto)} alt="" /> : iniciales(m.nombre)}
          </span>
          <div className="sg-progreso-titulo">
            <small>{SERVICIOS[r.servicio]} · {rango(r.fechaInicio, r.fechaFin)}</small>
            <strong>{enCurso ? `Día ${r.diaActual} de ${r.totalDias}` : ESTADOS[r.estado]}</strong>
          </div>
        </div>
        {enCurso && (
          <div className="sg-dias" role="img" aria-label={`Día ${r.diaActual} de ${r.totalDias}`}>
            {Array.from({ length: r.totalDias }, (_, i) => (
              <span key={i} className={i < r.diaActual - 1 ? 'sg-dia--hecho' : i === r.diaActual - 1 ? 'sg-dia--hoy' : ''} />
            ))}
          </div>
        )}
        {activa && (
          <p className="sg-progreso-nota">
            <IconReloj width="18" height="18" /> {r.soy === 'viajero' ? `Recoges a ${m.nombre}` : 'Devuelves la mascota'} el <strong>{diaCorto(r.fechaFin)}</strong>
          </p>
        )}
        {r.fase === 'pendiente' && r.responderAntes && (
          <p className="sg-progreso-nota">
            <IconReloj width="18" height="18" /> {primerNombre(r.cuidador.nombre)} debe responder antes del {fechaHora(r.responderAntes)}
          </p>
        )}
      </section>

      {r.estado === 'rechazada' && r.motivoRechazo && (
        <p className="sg-aviso sg-aviso--rojo">Motivo del rechazo: {r.motivoRechazo}</p>
      )}

      {chatExiste && (
        <div className="sg-acciones">
          <Link to={`/reservas/${r.id}/chat`} state={DESDE_APP} className="sg-boton-principal">
            <IconChat /> {r.chat.abierto ? `Escribir a ${primerNombre(otro.nombre)}` : 'Ver chat'}
            {r.chat.sinLeer > 0 && <span className="sg-insignia">{r.chat.sinLeer}</span>}
          </Link>
          {emergencia.puedeAlertar && (
            <button type="button" className="sg-boton-borde sg-boton-borde--rojo" onClick={() => setVerEmergencia(true)}>
              <IconAlerta width="18" height="18" /> Emergencia
            </button>
          )}
          {d.puedeReportar && !verForm && (
            <button type="button" className="sg-boton-borde" onClick={() => setVerForm(true)}><IconMas width="18" height="18" /> Nuevo reporte</button>
          )}
        </div>
      )}

      {faltaHoy && (
        <p className="sg-aviso">
          {r.soy === 'cuidador'
            ? `Aún no has subido el reporte de hoy. ${primerNombre(r.viajero.nombre)} espera saber cómo está ${m.nombre}.`
            : `${primerNombre(r.cuidador.nombre)} aún no ha subido el reporte de hoy.`}
        </p>
      )}
      {diasPasadosSinReporte.length > 0 && (
        <p className="sg-aviso sg-aviso--rojo">
          Días sin reporte: {diasPasadosSinReporte.map(diaCorto).join(', ')}. El cuidador debe subir al menos uno al día.
        </p>
      )}

      {verForm && (
        <FormReporte reservaId={r.id} mascota={m.nombre} onCreado={() => { setVerForm(false); cargar(); }} />
      )}

      {activa && (
        <section>
          <h2 className="sg-titulo-seccion">Reportes</h2>
          {d.reportes.length === 0 && (
            <p className="sg-vacio">{r.fase === 'proxima' ? 'Los reportes aparecerán cuando empiece el servicio.' : 'Todavía no hay reportes.'}</p>
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
        <h2 className="sg-titulo-seccion">Detalles de la reserva</h2>
        <div className="sg-tarjeta">
          <dl className="sg-datos">
            <Dato etiqueta="Reserva">#{r.id}</Dato>
            <Dato etiqueta="Servicio">{SERVICIOS[r.servicio]}</Dato>
            <Dato etiqueta="Fechas">{rango(r.fechaInicio, r.fechaFin)}</Dato>
            <Dato etiqueta="Estado">{ESTADOS[r.estado]}</Dato>
            <Dato etiqueta="Solicitada">{fechaHora(r.creadaEn)}</Dato>
            {r.respondidaEn && <Dato etiqueta="Respondida">{fechaHora(r.respondidaEn)}</Dato>}
          </dl>
          <div className="sg-precio">
            <div><span>{r.unidades} {r.unidades === 1 ? uno : varios} × {dinero(r.tarifa, r.moneda)}</span><span>{dinero(r.tarifa * r.unidades, r.moneda)}</span></div>
            <div className="sg-precio-total"><strong>Total</strong><strong>{dinero(r.total, r.moneda)}</strong></div>
          </div>
          {r.nota && <p className="sg-nota">“{r.nota}”</p>}
        </div>
      </section>

      <section>
        <h2 className="sg-titulo-seccion">{r.soy === 'viajero' ? 'Tu cuidador' : 'Viajero'}</h2>
        <div className="sg-tarjeta sg-persona">
          <span className="sg-avatar sg-avatar--redondo">
            {otro.foto ? <img src={urlArchivo(otro.foto)} alt="" /> : iniciales(otro.nombre)}
          </span>
          <span>
            <strong>{otro.nombre}</strong>
            {r.soy === 'viajero' && <small>{[r.cuidador.barrio, r.cuidador.ciudad].filter(Boolean).join(', ')}</small>}
          </span>
          {r.soy === 'viajero' && <Link className="sg-enlace sg-persona-enlace" to={`/cuidadores/${r.cuidador.id}`} state={{ desdeBusqueda: true }}>Ver perfil</Link>}
        </div>
      </section>

      <section>
        <h2 className="sg-titulo-seccion">Mascota</h2>
        <div className="sg-tarjeta">
          <div className="sg-persona sg-persona--sin-borde">
            <span className="sg-avatar">{m.foto ? <img src={urlArchivo(m.foto)} alt="" /> : iniciales(m.nombre)}</span>
            <span>
              <strong>{m.nombre}{m.fina ? ' · Fina' : ''}</strong>
              <small>{[m.especie && m.especie[0].toUpperCase() + m.especie.slice(1), m.raza, edad(m.edadMeses), m.pesoKg ? `${String(m.pesoKg).replace('.', ',')} kg` : null].filter(Boolean).join(' · ')}</small>
            </span>
          </div>
          <dl className="sg-datos">
            <Dato etiqueta="Vacunas">{m.vacunas}</Dato>
            <Dato etiqueta="Microchip">{m.microchip}</Dato>
            <Dato etiqueta="Indicaciones">{m.indicaciones}</Dato>
            {emergencia.veterinario && (
              <Dato etiqueta="Veterinario">{emergencia.veterinario.nombre} · {emergencia.veterinario.telefono}</Dato>
            )}
          </dl>
        </div>
      </section>

      {emergencia.alertas.length > 0 && (
        <section>
          <h2 className="sg-titulo-seccion">Alertas de emergencia</h2>
          <ul className="sg-alertas">
            {emergencia.alertas.map((a) => (
              <li key={a.id}>
                <IconAlerta width="16" height="16" />
                <span>{a.mensaje}<small>{diaCorto(a.creadoEn)} · {hora(a.creadoEn)}</small></span>
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
