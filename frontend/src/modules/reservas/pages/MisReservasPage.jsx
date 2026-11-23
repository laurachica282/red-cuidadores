import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { BotonEmergencia, Campana, resumenReservas } from '@/modules/seguimiento';
import { cancelarReserva, confirmarReserva, cotizarCancelacion, rechazarReserva, reservasMias, reservasRecibidas, misPagos } from '../services/reservasService.js';
import { ESTADOS, SERVICIOS, cuandoReserva, fechaCorta, fechaHora, precio } from '../utils.js';
import './reservas.css';

// Fase de cada reserva según las fechas (la calcula el módulo seguimiento); si no llegó, se deduce del estado.
const FASE_POR_ESTADO = {
  pendiente: 'pendiente', confirmada: 'proxima', en_curso: 'en_curso', completada: 'terminada',
  rechazada: 'inactiva', vencida: 'inactiva', cancelada: 'inactiva',
};
const FILTROS = [
  { valor: 'activas', texto: 'Activas', fases: ['en_curso', 'proxima', 'pendiente'] },
  { valor: 'pasadas', texto: 'Pasadas', fases: ['terminada'] },
  { valor: 'canceladas', texto: 'Canceladas', fases: ['inactiva'] },
  { valor: 'todas', texto: 'Todas' },
];
const ORDEN = { en_curso: 0, pendiente: 1, proxima: 2, terminada: 3, inactiva: 4 };
// El seguimiento (reportes, chat, emergencia) existe desde la solicitud hasta después del servicio.
const CON_SEGUIMIENTO = ['pendiente', 'confirmada', 'en_curso', 'completada'];

// HU-22: el cuidador ve el detalle de la comisión; HU-21: el viajero ve lo que se le devolvió.
function textoPago(pago, esCuidador, moneda) {
  const $ = (v) => precio(v, moneda);
  const devuelto = Number(pago.monto_reembolsado ?? 0);
  const base = Number(pago.monto) - devuelto;
  const comision = `${$(base)} − comisión ${Number(pago.comision_pct)} % (${$(pago.comision)})`;
  if (pago.estado === 'retenido') {
    return esCuidador
      ? `Pago retenido · al terminar recibirás ${$(pago.neto_cuidador)} (${comision})`
      : `Pago recibido (${pago.detalle}) · queda retenido hasta que termine el servicio`;
  }
  if (pago.estado === 'liberado') {
    if (esCuidador) return `Pago liberado · recibiste ${$(pago.neto_cuidador)} (${comision})`;
    return devuelto > 0 ? `Se te devolvieron ${$(devuelto)}; el resto se pagó al cuidador` : 'Pago liberado al cuidador';
  }
  return esCuidador ? 'Pago reembolsado al viajero' : `Pago reembolsado · se te devolvieron ${$(devuelto || pago.monto)}`;
}

export default function MisReservasPage() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const esCuidador = rol === 'cuidador';
  const [reservas, setReservas] = useState([]);
  const [seguimiento, setSeguimiento] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [filtro, setFiltro] = useState('activas');
  const [pagos, setPagos] = useState({});
  // HU-21: reserva que se está por cancelar, con lo que se devolvería.
  const [cancelando, setCancelando] = useState(null);

  const cargar = useCallback(async () => {
    if (rol === 'admin') {
      setCargando(false);
      return;
    }
    try {
      const [lista, resumen, pagosLista] = await Promise.all([
        esCuidador ? reservasRecibidas() : reservasMias(),
        resumenReservas().catch(() => []),
        misPagos().catch(() => []),
      ]);
      setReservas(lista);
      setSeguimiento(Object.fromEntries(resumen.map((r) => [String(r.id), r])));
      setPagos(Object.fromEntries(pagosLista.map((p) => [String(p.reserva_id), p])));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [rol, esCuidador]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function ejecutar(accion) {
    setError('');
    try {
      await accion();
      setRechazando(null);
      setMotivo('');
      setCancelando(null);
    } catch (e) {
      setError(e.message);
    }
    await cargar();
  }

  async function pedirCancelacion(id) {
    setError('');
    try {
      setCancelando({ id, ...(await cotizarCancelacion(id)) });
    } catch (e) {
      setError(e.message);
    }
  }

  if (rol === 'admin') {
    return <main className="rs-pagina"><p className="rs-texto">Las reservas son para viajeros y cuidadores.</p></main>;
  }

  const fase = (r) => seguimiento[String(r.id)]?.fase ?? FASE_POR_ESTADO[r.estado];
  const contar = (f) => reservas.filter((r) => !f.fases || f.fases.includes(fase(r))).length;
  const fases = FILTROS.find((f) => f.valor === filtro).fases;
  const visibles = reservas
    .filter((r) => !fases || fases.includes(fase(r)))
    .sort((a, b) => ORDEN[fase(a)] - ORDEN[fase(b)]);

  return (
    <main className="rs-pagina">
      <div className="rs-encabezado">
        <h1 className="rs-titulo">{esCuidador ? 'Reservas recibidas' : 'Mis reservas'}</h1>
        <Campana />
      </div>

      <div className="rs-segmentos" role="group" aria-label="Filtrar reservas">
        {FILTROS.map((f) => (
          <button key={f.valor} type="button" aria-pressed={filtro === f.valor}
            className={`rs-segmento${filtro === f.valor ? ' rs-segmento--activo' : ''}`} onClick={() => setFiltro(f.valor)}>
            {f.texto} <span>{contar(f)}</span>
          </button>
        ))}
      </div>

      {error && <p className="rs-aviso rs-aviso--error" role="alert">{error}</p>}
      {cargando && <p className="rs-texto">Cargando…</p>}
      {!cargando && visibles.length === 0 && (
        <p className="rs-vacio-lista">
          {filtro === 'activas' ? 'No tienes reservas activas.' : 'No hay reservas aquí.'}
          {filtro === 'activas' && !esCuidador && <> <Link className="rs-enlace" to="/inicio">Buscar un cuidador</Link></>}
        </p>
      )}

      <ul className="rs-lista">
        {visibles.map((r) => {
          const s = seguimiento[String(r.id)];
          const pago = pagos[String(r.id)];
          const enCurso = fase(r) === 'en_curso';
          return (
            <li key={r.id} className={`rs-tarjeta${enCurso ? ' rs-tarjeta--en-curso' : ''}`}>
              {/* Toda la parte de arriba abre la reserva con su información completa. */}
              <Link className="rs-tarjeta-enlace" to={`/reservas/${r.id}/seguimiento`} state={{ desde: 'reservas' }}>
                <div className="rs-cabecera">
                  <strong>{SERVICIOS[r.servicio]?.texto ?? r.servicio}</strong>
                  <span className={`rs-estado rs-estado--${enCurso ? 'en_curso' : r.estado}`}>
                    {enCurso && s ? `En curso · Día ${s.diaActual}/${s.totalDias}` : (ESTADOS[r.estado] ?? r.estado)}
                  </span>
                </div>
                <p className="rs-texto">
                  {esCuidador ? `Viajero: ${r.viajero}` : `Cuidador: ${r.cuidador}`} · Mascota: {r.mascota}
                </p>
                <p className="rs-texto">
                  {cuandoReserva(r)} · <strong>{precio(r.total, r.moneda.trim())}</strong>
                </p>
                {r.nota && <p className="rs-texto">“{r.nota}”</p>}
                {r.estado === 'pendiente' && (
                  <p className="rs-texto">Responder antes del {fechaHora(r.responder_antes)}</p>
                )}
                {['rechazada', 'cancelada'].includes(r.estado) && r.motivo_rechazo && <p className="rs-texto">Motivo: {r.motivo_rechazo}</p>}
                {r.estado === 'confirmada' && !pago && (
                  <p className="rs-texto rs-texto--aviso">
                    {(() => {
                      // Alojamiento: se paga hasta el día de inicio; por horas, antes de la hora de inicio.
                      const plazo = r.hora_inicio
                        ? `antes de las ${r.hora_inicio.slice(0, 5)} del ${fechaCorta(r.fecha_inicio)}`
                        : `hasta el ${fechaCorta(r.fecha_inicio)}`;
                      return esCuidador
                        ? `Esperando el pago del viajero (${plazo})`
                        : `Paga ${plazo}; si no, la reserva se cancela sola`;
                    })()}
                  </p>
                )}
                <span className="rs-ver">Ver reserva →</span>
              </Link>

              {/* Reportes, chat y emergencia de la reserva (módulo seguimiento, HU-30/31/28). */}
              {CON_SEGUIMIENTO.includes(r.estado) && (
                <div className="rs-seguimiento">
                  <Link className="rs-boton-seguimiento" to={`/reservas/${r.id}/seguimiento`} state={{ desde: 'reservas' }}>
                    Seguimiento{s?.resumen.reportes ? <span className="rs-cuenta">{s.resumen.reportes}</span> : ''}
                  </Link>
                  <Link className="rs-boton-seguimiento" to={`/reservas/${r.id}/chat`} state={{ desde: 'reservas' }}>
                    Chat{s?.resumen.sinLeer ? <span className="rs-sin-leer">{s.resumen.sinLeer}</span> : ''}
                  </Link>
                  {enCurso && !esCuidador && <BotonEmergencia reservaId={r.id} className="rs-emergencia" />}
                </div>
              )}
              {pago && <p className="rs-texto">{textoPago(pago, esCuidador, r.moneda.trim())}</p>}
              {r.estado === 'confirmada' && !esCuidador && cancelando?.id !== r.id && (
                <div className="rs-acciones">
                  {!pago && <Link className="btn-primary" to={`/pagos/reserva/${r.id}`}>Pagar {precio(r.total, r.moneda.trim())}</Link>}
                  <button type="button" className="rs-boton-claro" onClick={() => pedirCancelacion(r.id)}>Cancelar reserva</button>
                </div>
              )}
              {cancelando?.id === r.id && (
                <div className="rs-cancelar" role="alertdialog" aria-labelledby={`cancelar-${r.id}`}>
                  <p id={`cancelar-${r.id}`} className="rs-cancelar-titulo">
                    {cancelando.pagada
                      ? <>Te devolveremos <strong>{precio(cancelando.reembolso, cancelando.moneda)}</strong> ({cancelando.porcentaje} %)</>
                      : 'Todavía no pagaste: cancelar no tiene costo'}
                  </p>
                  {cancelando.pagada && (
                    <ul className="rs-politica">
                      {cancelando.politica.map((t) => (
                        <li key={t} className={t === cancelando.regla ? 'rs-politica--aplica' : ''}>{t}</li>
                      ))}
                    </ul>
                  )}
                  <div className="rs-acciones">
                    <button type="button" className="btn-primary rs-boton-peligro" onClick={() => ejecutar(() => cancelarReserva(r.id))}>
                      Sí, cancelar
                    </button>
                    <button type="button" className="rs-boton-claro" onClick={() => setCancelando(null)}>Volver</button>
                  </div>
                </div>
              )}

              {r.estado === 'pendiente' && esCuidador && (
                <div className="rs-acciones">
                  <button type="button" className="btn-primary" onClick={() => ejecutar(() => confirmarReserva(r.id))}>
                    Confirmar
                  </button>
                  {rechazando === r.id ? (
                    <>
                      <label className="label" htmlFor={`motivo-${r.id}`}>Motivo del rechazo</label>
                      <input id={`motivo-${r.id}`} className="input" value={motivo} maxLength={300}
                        onChange={(e) => setMotivo(e.target.value)} />
                      <button type="button" className="rs-boton-claro" onClick={() => ejecutar(() => rechazarReserva(r.id, motivo))}>
                        Enviar rechazo
                      </button>
                    </>
                  ) : (
                    <button type="button" className="rs-boton-claro" onClick={() => setRechazando(r.id)}>Rechazar</button>
                  )}
                </div>
              )}
              {r.estado === 'pendiente' && !esCuidador && (
                <div className="rs-acciones">
                  <button type="button" className="rs-boton-claro" onClick={() => ejecutar(() => cancelarReserva(r.id))}>
                    Cancelar solicitud
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
