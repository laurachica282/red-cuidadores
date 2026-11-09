import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { BotonEmergencia, Campana, resumenReservas } from '@/modules/seguimiento';
import {
  cancelarReserva, confirmarReserva, rechazarReserva, reservasMias, reservasRecibidas,
} from '../services/reservasService.js';
import { ESTADOS, SERVICIOS, fechaCorta, fechaHora, precio } from '../utils.js';
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

  const cargar = useCallback(async () => {
    if (rol === 'admin') {
      setCargando(false);
      return;
    }
    try {
      const [lista, resumen] = await Promise.all([
        esCuidador ? reservasRecibidas() : reservasMias(),
        resumenReservas().catch(() => []),
      ]);
      setReservas(lista);
      setSeguimiento(Object.fromEntries(resumen.map((r) => [String(r.id), r])));
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
    } catch (e) {
      setError(e.message);
    }
    await cargar();
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
                  {fechaCorta(r.fecha_inicio)} – {fechaCorta(r.fecha_fin)} · <strong>{precio(r.total, r.moneda.trim())}</strong>
                </p>
                {r.nota && <p className="rs-texto">“{r.nota}”</p>}
                {r.estado === 'pendiente' && (
                  <p className="rs-texto">Responder antes del {fechaHora(r.responder_antes)}</p>
                )}
                {r.estado === 'rechazada' && r.motivo_rechazo && <p className="rs-texto">Motivo: {r.motivo_rechazo}</p>}
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
