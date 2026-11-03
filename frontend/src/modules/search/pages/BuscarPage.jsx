import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '@/modules/region';
import { buscarCuidadores, urlApi } from '../services/busquedaService.js';
import { IconEscudo, IconEstrella, IconLupa, IconUbicacion } from '../components/Iconos.jsx';
import MapaResultados from '../components/MapaResultados.jsx';
import PanelFiltros from '../components/PanelFiltros.jsx';
import { FILTROS_VACIOS, contarFiltros, resumirFiltros } from '../filtros.js';
import { guardarPunto, leerPunto, nombreCorto } from '../ubicacion.js';
import { SERVICIOS, formatoCalificacion, iniciales, noches, rangoFechas } from '../utils.js';
import '../busqueda.css';

const MAX_SERVICIOS = 2;

// Servicios del cuidador en una sola línea: primero el que se busca, y "+N" si no caben.
function ServiciosCuidador({ servicios, activo }) {
  const lista = SERVICIOS.filter((s) => servicios.includes(s.valor))
    .sort((a, b) => (b.valor === activo) - (a.valor === activo));
  const resto = lista.length - MAX_SERVICIOS;
  return (
    <span className="bs-servicios-chips">
      {lista.slice(0, MAX_SERVICIOS).map((s) => (
        <span key={s.valor} className={`bs-servicio-chip${activo === s.valor ? ' bs-servicio-chip--activo' : ''}`}>
          {s.corto ?? s.texto}
        </span>
      ))}
      {resto > 0 && <span className="bs-servicio-chip" title={lista.slice(MAX_SERVICIOS).map((s) => s.texto).join(', ')}>+{resto}</span>}
    </span>
  );
}

const formatoKm = (km) => `${km.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;

// HU-15 · mockup 1: buscar cuidadores por ubicación, fechas, tipo de mascota y precio.
export default function BuscarPage() {
  const { precio } = useIdioma();
  // Dirección elegida en el mapa; null = la ciudad del perfil.
  const [punto, setPunto] = useState(leerPunto);
  // undefined = la que decida el servidor (la ciudad del perfil); 'todas' = sin filtro.
  const [ciudad, setCiudad] = useState(undefined);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [verFiltros, setVerFiltros] = useState(false);
  const [resaltado, setResaltado] = useState(null);
  // Zona del mapa que se está mirando (null = todos los resultados) y contador para volver a encuadrar.
  const [vista, setVista] = useState(null);
  const [versionMapa, setVersionMapa] = useState(0);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [respondida, setRespondida] = useState('');

  const { desde, hasta, radioKm, ...resto } = { ...FILTROS_VACIOS, ...filtros };
  const fechasListas = Boolean(desde && hasta);
  const clave = JSON.stringify({
    ...resto,
    q: resto.q.trim(),
    ...(punto ? { lat: punto.lat, lng: punto.lng, radioKm } : { ciudad }),
    ...(fechasListas && { desde, hasta }),
  });
  // Se está cargando mientras la última respuesta no corresponda a los filtros actuales.
  const cargando = respondida !== clave;

  useEffect(() => {
    let vivo = true;
    buscarCuidadores(JSON.parse(clave))
      .then((d) => { if (vivo) { setDatos(d); setError(''); } })
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setRespondida(clave));
    return () => { vivo = false; };
  }, [clave]);

  const cerrarFiltros = useCallback(() => setVerFiltros(false), []);
  const cambiarPunto = (p) => {
    setPunto(p);
    guardarPunto(p);
    setCiudad(undefined);
  };
  // Lo que se eligió en el panel: filtros y zona (dirección o ciudad).
  const aplicar = (f, zona) => {
    setFiltros(f);
    if (zona.punto) cambiarPunto(zona.punto);
    else {
      setPunto(null);
      guardarPunto(null);
      setCiudad(zona.ciudad);
    }
    setVerFiltros(false);
  };

  const ubicacion = datos?.ubicacion;
  const ciudadElegida = punto ? null : (ciudad ?? datos?.ciudadAplicada ?? 'todas');
  const resultados = datos?.cuidadores ?? [];
  // Al mover el mapa, la lista muestra solo los cuidadores que quedan a la vista.
  const lista = vista ? resultados.filter((c) => c.ubicacion && vista.contains([c.ubicacion.lat, c.ubicacion.lng])) : resultados;
  const verTodos = () => { setVista(null); setVersionMapa((v) => v + 1); };
  const moneda = ubicacion?.moneda ?? 'COP';
  const n = noches(desde, hasta);
  const activos = contarFiltros({ ...FILTROS_VACIOS, ...filtros });
  const resumen = resumirFiltros({ ...FILTROS_VACIOS, ...filtros }, precio, moneda);
  const enlacePerfil = (c) => {
    const params = new URLSearchParams();
    if (fechasListas) { params.set('desde', desde); params.set('hasta', hasta); }
    if (c.distanciaKm !== null) params.set('km', c.distanciaKm);
    const qs = params.toString();
    return qs ? `/cuidadores/${c.id}?${qs}` : `/cuidadores/${c.id}`;
  };

  let tituloLista = 'En tu región';
  if (punto || ciudadElegida !== 'todas') tituloLista = 'Cerca de ti';
  if (vista) tituloLista = 'En esta zona del mapa';
  // La barra dice dónde se busca; debajo, las fechas y los filtros como etiquetas.
  let zonaTexto = ciudadElegida ?? 'Buscar cuidador';
  if (ciudadElegida === 'todas') zonaTexto = `Todo ${ubicacion?.paisNombre ?? 'el país'}`;
  if (punto) zonaTexto = nombreCorto(punto);
  if (!datos && !punto) zonaTexto = 'Buscar cuidador';
  const etiquetas = fechasListas ? [`${rangoFechas(desde, hasta)} · ${n} ${n === 1 ? 'noche' : 'noches'}`, ...resumen] : resumen;

  return (
    <main className="page bs-page">
      <h1 className="bs-titulo">Encuentra un cuidador para tu mascota</h1>

      <button type="button" className="bs-personalizar" aria-haspopup="dialog" onClick={() => setVerFiltros(true)}>
        <span className="bs-personalizar-icono"><IconLupa width="22" height="22" /></span>
        <span className="bs-personalizar-texto">
          <strong className="bs-personalizar-zona"><IconUbicacion width="16" height="16" className="bs-acento" /> {zonaTexto}</strong>
          <span className="bs-resumen">
            {etiquetas.map((r) => <span key={r} className="bs-resumen-item">{r}</span>)}
          </span>
        </span>
        {activos > 0 && <span className="bs-contador" aria-label={`${activos} filtros activos`}>{activos}</span>}
      </button>

      <MapaResultados cuidadores={resultados} punto={punto} precio={precio} enlacePerfil={enlacePerfil} resaltado={resaltado}
        version={versionMapa} onVista={setVista} />

      <div className="bs-encabezado">
        <h2>{tituloLista}</h2>
        {!error && datos && <small>{lista.length} {lista.length === 1 ? 'cuidador verificado' : 'cuidadores verificados'}</small>}
      </div>
      {vista && lista.length > 0 && lista.length < resultados.length && (
        <button type="button" className="bs-enlace bs-ver-todos" onClick={verTodos}>
          Ver los {resultados.length} cuidadores de la búsqueda
        </button>
      )}

      {error && <p className="bs-error" role="alert">{error}</p>}
      {cargando && !datos && <p className="bs-sub">Buscando cuidadores…</p>}
      {!error && datos && vista && lista.length === 0 && resultados.length > 0 && (
        <div className="bs-vacio">
          <p>No hay cuidadores en esta parte del mapa.</p>
          <button type="button" className="bs-enlace" onClick={verTodos}>Ver todos</button>
        </div>
      )}
      {!error && datos && resultados.length === 0 && (
        <div className="bs-vacio">
          <p>No encontramos cuidadores con esos filtros.</p>
          {activos > 0 && <button type="button" className="bs-enlace" onClick={() => setFiltros(FILTROS_VACIOS)}>Quitar filtros</button>}
          {punto && (
            <button type="button" className="bs-enlace" onClick={() => setFiltros((f) => ({ ...f, radioKm: 20 }))}>Buscar hasta 20 km</button>
          )}
          {!punto && ciudadElegida !== 'todas' && (
            <button type="button" className="bs-enlace" onClick={() => setCiudad('todas')}>Ver toda la región</button>
          )}
        </div>
      )}

      <ul className={`bs-lista${cargando ? ' bs-lista--cargando' : ''}`} aria-busy={cargando}>
        {lista.map((c) => (
          <li key={c.id} onMouseEnter={() => setResaltado(c.id)} onMouseLeave={() => setResaltado(null)}>
            <Link to={enlacePerfil(c)} className="bs-card">
              <span className="bs-avatar">
                {c.fotoPerfil ? <img src={urlApi(c.fotoPerfil)} alt="" loading="lazy" /> : iniciales(c.nombre)}
              </span>
              <span className="bs-card-info">
                <span className="bs-card-titulo">
                  <strong className="bs-card-nombre">{c.nombre}</strong>
                  <IconEscudo width="16" height="16" className="bs-acento" aria-label="Antecedentes verificados" role="img" />
                </span>
                <small className="bs-sub">
                  {[c.barrio ?? c.ciudad, c.distanciaKm === null ? null : formatoKm(c.distanciaKm)].filter(Boolean).join(' · ')}
                </small>
                <ServiciosCuidador servicios={c.servicios} activo={filtros.servicio} />
                <span className="bs-card-fila bs-card-pie">
                  {c.calificacion === null ? (
                    <small className="bs-nuevo">Nuevo</small>
                  ) : (
                    <span className="bs-calificacion">
                      <IconEstrella width="15" height="15" className="bs-estrella" />
                      <strong>{formatoCalificacion(c.calificacion)}</strong> <small>({c.totalResenas})</small>
                    </span>
                  )}
                  <span className="bs-precio">
                    {!filtros.servicio && <small>desde </small>}
                    {precio(c.tarifa, c.moneda)}<small>/{c.unidad}</small>
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {verFiltros && (
        <PanelFiltros inicial={{ ...FILTROS_VACIOS, ...filtros }} moneda={moneda} onCerrar={cerrarFiltros}
          zonaInicial={{ punto, ciudad: ciudadElegida }} ciudades={datos?.ciudades ?? []} pais={ubicacion?.paisNombre}
          onAplicar={aplicar} />
      )}
    </main>
  );
}
