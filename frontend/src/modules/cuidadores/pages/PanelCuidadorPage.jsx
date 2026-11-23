import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import { cuandoReserva, nombreServicio } from '@/modules/reservas';
import { Campana } from '@/modules/seguimiento';
import { armarAgenda, proximosServicios, sumarDias } from '../agenda.js';
import ServicioAgenda from '../components/ServicioAgenda.jsx';
import { IconBilletera, IconCheck, IconChevron, IconEscudo, IconReloj } from '../components/Iconos.jsx';
import {
  aceptarReserva, misPagos, obtenerDatosCobro, obtenerMiPerfil, reservasRecibidas, seguimientoReservas,
} from '../services/cuidadoresService.js';
import '../i18n.js';
import '../cuidadores.css';
import '../tablero.css';

const primerNombre = (nombre = '') => nombre.split(' ')[0];

// Arma lo que el tablero necesita a partir de las respuestas del servidor.
function resumir({ recibidas, seguimiento, pagos }) {
  const { hoy, items } = armarAgenda(recibidas, seguimiento);
  const pendientes = recibidas
    .filter((r) => r.estado === 'pendiente')
    .sort((a, b) => String(a.responder_antes).localeCompare(String(b.responder_antes)));

  const mes = hoy.slice(0, 7);
  const neto = (p) => Number(p.neto_cuidador ?? 0);

  return {
    hoy,
    ahora: Date.now(),
    pendientes,
    agenda: proximosServicios(items, hoy, 3),
    porCobrar: pagos.filter((p) => p.estado === 'retenido').reduce((t, p) => t + neto(p), 0),
    cobradoMes: pagos
      .filter((p) => p.estado === 'liberado' && String(p.liberado_en ?? '').slice(0, 7) === mes)
      .reduce((t, p) => t + neto(p), 0),
    completadas: recibidas.filter((r) => r.estado === 'completada').length,
    moneda: pagos[0]?.moneda ?? recibidas[0]?.moneda ?? 'COP',
  };
}

// Inicio del cuidador: lo que tiene que responder, su agenda del día y sus ganancias.
export default function PanelCuidadorPage() {
  const { usuario } = useAuth();
  const { t, precio, fecha, locale } = useIdioma();
  const [perfil, setPerfil] = useState(null);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aceptando, setAceptando] = useState(null);
  // Sin datos de cobro se le recuerda arriba (no bloquea nada). Es lo primero que ve al iniciar sesión.
  const [sinCobro, setSinCobro] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [recibidas, seguimiento, pagos] = await Promise.all([
        reservasRecibidas(), seguimientoReservas(), misPagos().catch(() => []),
      ]);
      setDatos(resumir({ recibidas, seguimiento, pagos }));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    obtenerMiPerfil().then((d) => vivo && setPerfil(d)).catch(() => {});
    obtenerDatosCobro().then((d) => vivo && setSinCobro(Boolean(d.opciones) && !d.datos)).catch(() => {});
    cargar();
    return () => { vivo = false; };
  }, [cargar]);

  const aceptar = async (id) => {
    setAceptando(id);
    try {
      await aceptarReserva(id);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setAceptando(null);
    }
  };

  // "Hoy", "Mañana", el día de esta semana ("vie 27") o, si es más adelante, día y mes ("22 dic").
  const nombreDia = (dia) => {
    if (dia === datos.hoy) return t('tablero.hoy');
    if (dia === sumarDias(datos.hoy, 1)) return t('tablero.manana');
    const opciones = dia <= sumarDias(datos.hoy, 6) ? { weekday: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' };
    return new Date(`${dia}T12:00:00`).toLocaleDateString(locale, opciones).replace('.', '');
  };

  // Cuánto falta para que venza la solicitud: "3 h" o "40 min".
  const faltaPara = (iso) => {
    const min = Math.max(0, Math.round((Date.parse(iso) - datos.ahora) / 60000));
    return min >= 60 ? t('tablero.quedan_h', { n: Math.floor(min / 60) }) : t('tablero.quedan_min', { n: min });
  };

  const primera = datos?.pendientes[0];

  return (
    <div className="cd-fondo">
      <main className="cd tb">
        <header className="tb-cab">
          <div>
            <p className="tb-fecha">{datos ? fecha(`${datos.hoy}T12:00:00`) : ''}</p>
            <h1>{t('panel.hola', { nombre: primerNombre(usuario.nombre) })}</h1>
          </div>
          <Campana />
        </header>

        {sinCobro && (
          <Link to="/cuidador/cobro" className="cd-caja cd-caja-alerta tb-aviso">
            <IconBilletera />
            <span className="cd-caja-texto">
              <strong>{t('cobro.aviso_titulo')}</strong>
              <p>{t('cobro.aviso_texto')}</p>
            </span>
            <IconChevron />
          </Link>
        )}

        {perfil && !perfil.visibleEnBusqueda && (
          <Link to="/cuidador/verificacion" className="cd-caja cd-caja-alerta tb-aviso">
            <IconEscudo width="20" height="20" />
            <span className="cd-caja-texto"><p>{t('panel.no_visible')}</p></span>
            <IconChevron />
          </Link>
        )}

        {error && <p className="cd-error" role="alert">{error}</p>}
        {!datos && !error && <p className="cd-sub">{t('comun.cargando')}</p>}

        {datos && (
          <>
            {/* Solicitudes por responder: solo la más urgente */}
            <section className="tb-seccion">
              <div className="tb-titulo">
                <h2>
                  {t('tablero.solicitudes')}
                  {datos.pendientes.length > 0 && <span className="tb-contador tb-contador--alerta">{datos.pendientes.length}</span>}
                </h2>
                {datos.pendientes.length > 1 && <Link to="/reservas">{t('tablero.ver_todas')}</Link>}
              </div>
              {!primera && <p className="tb-vacio">{t('tablero.sin_solicitudes')}</p>}
              {primera && (
                <article className="tb-tarjeta">
                  <div className="tb-tarjeta-cab">
                    <strong>{nombreServicio(primera.servicio)} · {primera.mascota}</strong>
                    <span className="tb-total">{precio(primera.total, primera.moneda)}</span>
                  </div>
                  <div className="tb-tarjeta-pie">
                    <p className="tb-linea">{primerNombre(primera.viajero)} · {cuandoReserva(primera)}</p>
                    {primera.responder_antes && (
                      <span className="tb-plazo"><IconReloj width="14" height="14" /> {faltaPara(primera.responder_antes)}</span>
                    )}
                  </div>
                  <div className="tb-acciones">
                    <button type="button" className="tb-boton tb-boton--primario" disabled={aceptando === primera.id}
                      onClick={() => aceptar(primera.id)}>
                      <IconCheck /> {aceptando === primera.id ? t('comun.guardando') : t('tablero.aceptar')}
                    </button>
                    <Link to="/reservas" className="tb-boton">{t('tablero.rechazar_o_ver')}</Link>
                  </div>
                </article>
              )}
            </section>

            {/* Agenda: los próximos servicios, empezando por hoy */}
            <section className="tb-seccion">
              <div className="tb-titulo">
                <h2>{t('tablero.agenda')}</h2>
                <Link to="/cuidador/agenda">{t('tablero.ver_calendario')}</Link>
              </div>
              {datos.agenda.length === 0 && <p className="tb-vacio">{t('tablero.sin_agenda')}</p>}
              {datos.agenda.length > 0 && (
                <div className="tb-servicios">
                  {datos.agenda.map(({ s, momento, dia }) => (
                    <ServicioAgenda key={s.id} s={s} momento={momento} dia={nombreDia(dia)} />
                  ))}
                </div>
              )}
            </section>

            {/* Ganancias */}
            <section className="tb-seccion">
              <div className="tb-titulo">
                <h2>{t('tablero.ganancias')}</h2>
                <Link to="/reservas">{t('tablero.ver_historial')}</Link>
              </div>
              <div className="tb-ganancias">
                <div className="tb-ganancias-principal">
                  <span>{t('tablero.por_cobrar')}</span>
                  <strong>{precio(datos.porCobrar, datos.moneda)}</strong>
                  <small>{t('tablero.ganancias_ayuda')}</small>
                </div>
                <dl className="tb-ganancias-filas">
                  <div><dt>{t('tablero.cobrado_mes')}</dt><dd>{precio(datos.cobradoMes, datos.moneda)}</dd></div>
                  <div><dt>{t('tablero.completados')}</dt><dd>{datos.completadas}</dd></div>
                </dl>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
