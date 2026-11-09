import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAlerta, IconAtras, IconCalendario, IconCamara, IconChat } from '../components/Iconos.jsx';
import { marcarLeida, marcarLeidas, marcarVistas, notificaciones } from '../services/seguimientoService.js';
import { DESDE_APP, useVolver } from '../useVolver.js';
import '../seguimiento.css';

const FILTROS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'reservas', texto: 'Reservas' },
  { valor: 'reportes', texto: 'Reportes' },
  { valor: 'mensajes', texto: 'Mensajes' },
];
const ICONOS = { reservas: IconCalendario, reportes: IconCamara, mensajes: IconChat, alertas: IconAlerta };
const DIA_MS = 24 * 60 * 60 * 1000;

// "Hace 20 min", "Hace 3 h", "Hace 2 días".
function haceCuanto(fecha) {
  const min = Math.max(1, Math.round((Date.now() - new Date(fecha)) / 60000));
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

function grupo(fecha) {
  const inicioHoy = new Date().setHours(0, 0, 0, 0);
  const t = new Date(fecha).getTime();
  if (t >= inicioHoy) return 'Hoy';
  if (t >= inicioHoy - 6 * DIA_MS) return 'Esta semana';
  return 'Antes';
}

// Mockup 5: avisos de reservas, reportes, mensajes y emergencias.
export default function NotificacionesPage() {
  const volver = useVolver('/inicio');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todas');

  // Al abrir la bandeja la campana vuelve a 0; los avisos siguen resaltados hasta tocarlos.
  useEffect(() => {
    notificaciones()
      .then((d) => { setDatos(d); return marcarVistas(); })
      .catch((e) => setError(e.message));
  }, []);

  const sinLeer = datos?.notificaciones.filter((n) => !n.leida).length ?? 0;

  async function leerTodas() {
    setDatos((d) => d && { ...d, notificaciones: d.notificaciones.map((n) => ({ ...n, leida: true })) });
    await marcarLeidas().catch(() => {});
  }

  // Se marca antes de navegar; si falla, no importa: la persona ya está viendo el aviso.
  function abrir(n) {
    if (!n.leida) marcarLeida(n.id).catch(() => {});
  }

  const lista = (datos?.notificaciones ?? []).filter((n) => filtro === 'todas' || n.tipo === filtro
    || (filtro === 'reservas' && n.tipo === 'alertas'));
  const grupos = ['Hoy', 'Esta semana', 'Antes']
    .map((g) => [g, lista.filter((n) => grupo(n.fecha) === g)])
    .filter(([, l]) => l.length);

  return (
    <main className="sg-pagina">
      <div className="sg-encabezado">
        <button type="button" className="sg-redondo" aria-label="Volver" onClick={volver}><IconAtras /></button>
        <h1>Notificaciones</h1>
        {sinLeer > 0 && <button type="button" className="sg-enlace sg-boton-texto" onClick={leerTodas}>Marcar leídas</button>}
      </div>

      <div className="sg-segmentos" role="group" aria-label="Filtrar notificaciones">
        {FILTROS.map((f) => (
          <button key={f.valor} type="button" aria-pressed={filtro === f.valor}
            className={`sg-segmento${filtro === f.valor ? ' sg-segmento--activo' : ''}`} onClick={() => setFiltro(f.valor)}>{f.texto}</button>
        ))}
      </div>

      {error && <p className="sg-error" role="alert">{error}</p>}
      {!datos && !error && <p className="sg-sub">Cargando…</p>}
      {datos && lista.length === 0 && <p className="sg-vacio">No tienes notificaciones aquí.</p>}

      {grupos.map(([g, avisos]) => (
        <section key={g}>
          <h2 className="sg-grupo-titulo">{g}</h2>
          <ul className="sg-avisos">
            {avisos.map((n) => {
              const Icono = ICONOS[n.tipo] ?? IconCalendario;
              return (
                <li key={n.id}>
                  <Link to={n.enlace} state={DESDE_APP} onClick={() => abrir(n)} className={`sg-aviso-item${n.leida ? '' : ' sg-aviso-item--nueva'}`}>
                    <span className={`sg-aviso-icono${n.tipo === 'alertas' ? ' sg-aviso-icono--rojo' : ''}`}><Icono /></span>
                    <span className="sg-aviso-texto">
                      <span className="sg-aviso-fila">
                        <strong>{n.titulo}</strong>
                        <small>{haceCuanto(n.fecha)}</small>
                      </span>
                      <span>{n.texto}</span>
                    </span>
                    {!n.leida && <span className="sg-punto" aria-label="Sin leer" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
