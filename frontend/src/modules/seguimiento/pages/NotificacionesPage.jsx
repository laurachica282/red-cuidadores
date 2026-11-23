import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { IconAlerta, IconAtras, IconCalendario, IconCamara, IconChat } from '../components/Iconos.jsx';
import { marcarLeida, marcarLeidas, marcarVistas, notificaciones } from '../services/seguimientoService.js';
import { traducirAviso } from '../utils.js';
import { DESDE_APP, useVolver } from '../useVolver.js';
import '../i18n.js';
import '../seguimiento.css';

const FILTROS = ['todas', 'reservas', 'reportes', 'mensajes'];
const GRUPOS = ['hoy', 'semana', 'antes'];
const ICONOS = { reservas: IconCalendario, reportes: IconCamara, mensajes: IconChat, alertas: IconAlerta };
const DIA_MS = 24 * 60 * 60 * 1000;

// "Hace 20 min", "Hace 3 h", "Hace 2 días".
function haceCuanto(fecha, t) {
  const min = Math.max(1, Math.round((Date.now() - new Date(fecha)) / 60000));
  if (min < 60) return t('seguimiento.notif.hace_min', { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t('seguimiento.notif.hace_h', { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? t('seguimiento.notif.hace_dia') : t('seguimiento.notif.hace_dias', { n: d });
}

function grupo(fecha) {
  const inicioHoy = new Date().setHours(0, 0, 0, 0);
  const t = new Date(fecha).getTime();
  if (t >= inicioHoy) return 'hoy';
  if (t >= inicioHoy - 6 * DIA_MS) return 'semana';
  return 'antes';
}

// Mockup 5: avisos de reservas, reportes, mensajes y emergencias.
export default function NotificacionesPage() {
  const { t } = useIdioma();
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
  const grupos = GRUPOS
    .map((g) => [g, lista.filter((n) => grupo(n.fecha) === g)])
    .filter(([, l]) => l.length);

  return (
    <main className="sg-pagina">
      <div className="sg-encabezado">
        <button type="button" className="sg-redondo" aria-label={t('seguimiento.volver')} onClick={volver}><IconAtras /></button>
        <h1>{t('seguimiento.notif.titulo')}</h1>
        {sinLeer > 0 && <button type="button" className="sg-enlace sg-boton-texto" onClick={leerTodas}>{t('seguimiento.notif.marcar_leidas')}</button>}
      </div>

      <div className="sg-segmentos" role="group" aria-label={t('seguimiento.notif.filtrar')}>
        {FILTROS.map((f) => (
          <button key={f} type="button" aria-pressed={filtro === f}
            className={`sg-segmento${filtro === f ? ' sg-segmento--activo' : ''}`} onClick={() => setFiltro(f)}>{t(`seguimiento.notif.filtro.${f}`)}</button>
        ))}
      </div>

      {error && <p className="sg-error" role="alert">{error}</p>}
      {!datos && !error && <p className="sg-sub">{t('seguimiento.cargando')}</p>}
      {datos && lista.length === 0 && <p className="sg-vacio">{t('seguimiento.notif.vacio')}</p>}

      {grupos.map(([g, avisos]) => (
        <section key={g}>
          <h2 className="sg-grupo-titulo">{t(`seguimiento.notif.grupo.${g}`)}</h2>
          <ul className="sg-avisos">
            {avisos.map((n) => {
              const Icono = ICONOS[n.tipo] ?? IconCalendario;
              const { titulo, texto } = traducirAviso(n);
              return (
                <li key={n.id}>
                  <Link to={n.enlace} state={DESDE_APP} onClick={() => abrir(n)} className={`sg-aviso-item${n.leida ? '' : ' sg-aviso-item--nueva'}`}>
                    <span className={`sg-aviso-icono${n.tipo === 'alertas' ? ' sg-aviso-icono--rojo' : ''}`}><Icono /></span>
                    <span className="sg-aviso-texto">
                      <span className="sg-aviso-fila">
                        <strong>{titulo}</strong>
                        <small>{haceCuanto(n.fecha, t)}</small>
                      </span>
                      <span>{texto}</span>
                    </span>
                    {!n.leida && <span className="sg-punto" aria-label={t('seguimiento.notif.sin_leer')} />}
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
