import { useEffect, useState } from 'react';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import { IconCerrar, IconLupa, IconUbicacion } from './Iconos.jsx';
import { direccionDe } from '../services/busquedaService.js';
import { obtenerMiUbicacion } from '../ubicacion.js';
import MapaDireccion from './MapaDireccion.jsx';
import { HORAS, SERVICIOS, TIPOS_MASCOTA, esPorHora, hoyISO, servicio, textoHora } from '../utils.js';
import { FILTROS_VACIOS, ORDENES, RADIOS_KM, errorFechas } from '../filtros.js';

// Fila de botones donde se elige una sola opción.
function Opciones({ opciones, valor, onElegir }) {
  return (
    <div className="bs-opciones">
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor}
          className={`bs-chip${valor === o.valor ? ' bs-chip--activo' : ''}`} onClick={() => onElegir(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

// Hoja que sube desde abajo con la zona, fechas y filtros de HU-15. Los cambios se aplican al tocar "Buscar".
// zona: { punto, ciudad } — punto = dirección elegida (busca por cercanía); si no, ciudad o 'todas'.
// ciudades: [{ nombre, cantidad }] de la región, como atajos.
export default function PanelFiltros({ inicial, zonaInicial, ciudades, pais, moneda, onAplicar, onCerrar }) {
  const { t } = useIdioma();
  const [f, setF] = useState(inicial);
  const [zona, setZona] = useState(zonaInicial);
  // Cambia al elegir una ciudad, para volver a montar el mapa y limpiar la dirección escrita.
  const [versionMapa, setVersionMapa] = useState(0);
  const conPunto = Boolean(zona.punto);
  const cambiar = (campo, valor) => setF((a) => ({ ...a, [campo]: valor }));
  const hoy = hoyISO();
  const errorPrecio = f.precioMin !== '' && f.precioMax !== '' && Number(f.precioMin) > Number(f.precioMax);
  const errorFecha = errorFechas(f, hoy);

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const limpiar = () => setF(FILTROS_VACIOS);

  const elegirCiudad = (ciudad) => {
    setZona({ punto: null, ciudad });
    setVersionMapa((v) => v + 1);
    // "Más cerca" solo tiene sentido con una dirección.
    if (f.orden === 'distancia') cambiar('orden', FILTROS_VACIOS.orden);
  };
  const elegirLugar = (punto) => setZona({ punto, ciudad: undefined });
  // Atajo "Cerca de mí" junto a las ciudades: ubica a la persona y busca alrededor.
  const [buscandoMiUbicacion, setBuscandoMiUbicacion] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const cercaDeMi = async () => {
    setBuscandoMiUbicacion(true);
    setErrorUbicacion('');
    try {
      const { lat, lng } = await obtenerMiUbicacion();
      const { direccion } = await direccionDe(lat, lng).catch(() => ({}));
      // Sin dirección conocida la etiqueta queda vacía: se muestra "Mi ubicación" en el idioma actual (etiquetaPunto).
      const punto = direccion ?? { etiqueta: '', barrio: null, ciudad: null, lat, lng };
      setZona({ punto: { ...punto, miUbicacion: true }, ciudad: undefined });
      setVersionMapa((v) => v + 1);
    } catch (e) {
      setErrorUbicacion(e.message);
    } finally {
      setBuscandoMiUbicacion(false);
    }
  };
  const ubicando = Boolean(zona.punto?.ubicando);
  const opcionesZona = [
    ...ciudades.map((c) => ({ valor: c.nombre, texto: `${c.nombre} (${c.cantidad})` })),
    { valor: 'todas', texto: t('busqueda.todoPais', { pais: pais ?? t('busqueda.elPais') }) },
  ];
  const cambiarEntrada = (valor) => setF((a) => ({
    ...a, desde: valor,
    hasta: a.hasta && (valor > a.hasta || (a.servicio === 'alojamiento' && valor === a.hasta)) ? '' : a.hasta,
  }));
  // Al cambiar de servicio se acomodan las fechas: por hora es un solo día; alojamiento no usa horas.
  const elegirServicio = (valor) => setF((a) => {
    const n = { ...a, servicio: valor };
    if (esPorHora(valor)) n.hasta = '';
    else { n.horaDesde = ''; n.horaHasta = ''; }
    return n;
  });
  const cambiarHoraDesde = (valor) => setF((a) => {
    // Si la de fin queda antes, se corre a una hora después.
    const fin = a.horaHasta && a.horaHasta > valor ? a.horaHasta : HORAS[HORAS.indexOf(valor) + 1] ?? '';
    return { ...a, horaDesde: valor, horaHasta: valor ? fin : a.horaHasta };
  });
  const porHora = esPorHora(f.servicio);

  return (
    <div className="bs-capa">
      <button type="button" className="bs-capa-fondo" aria-label={t('busqueda.cerrarFiltros')} onClick={onCerrar} />
      <div className="bs-hoja" role="dialog" aria-modal="true" aria-labelledby="bs-filtros-titulo">
        <div className="bs-hoja-cabecera">
          <h2 id="bs-filtros-titulo">{t('busqueda.buscarCuidador')}</h2>
          <button type="button" className="bs-redondo bs-redondo--chico" aria-label={t('busqueda.cerrar')} onClick={onCerrar}><IconCerrar /></button>
        </div>
        <div className="bs-hoja-cuerpo">
          <fieldset className="bs-grupo bs-grupo--primero">
            <legend>{t('busqueda.zona')}</legend>
            <MapaDireccion key={versionMapa} valor={zona.punto} onCambiar={elegirLugar}
              placeholder={t('busqueda.placeholderZona')} />
            <p className="bs-ayuda">{t('busqueda.oCiudad')}</p>
            <div className="bs-opciones bs-opciones--zona">
              {opcionesZona.map((o) => {
                const activa = !conPunto && zona.ciudad === o.valor;
                return (
                  <button key={o.valor} type="button" aria-pressed={activa}
                    className={`bs-chip${activa ? ' bs-chip--activo' : ''}`} onClick={() => elegirCiudad(o.valor)}>
                    {o.texto}
                  </button>
                );
              })}
              <button type="button" aria-pressed={Boolean(zona.punto?.miUbicacion)} disabled={buscandoMiUbicacion}
                className={`bs-chip bs-chip--ubicacion${zona.punto?.miUbicacion ? ' bs-chip--activo' : ''}`} onClick={cercaDeMi}>
                <IconUbicacion width="16" height="16" /> {t(buscandoMiUbicacion ? 'busqueda.ubicando' : 'busqueda.cercaDeMi')}
              </button>
            </div>
            {errorUbicacion && <p className="bs-error" role="alert">{errorUbicacion}</p>}
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>{t('busqueda.tipoServicio')}</legend>
            <Opciones opciones={[{ valor: '', texto: t('busqueda.todos') }, ...SERVICIOS.map((s) => ({ valor: s.valor, texto: s.corto }))]}
              valor={f.servicio} onElegir={elegirServicio} />
            {f.servicio && (
              <p className="bs-ayuda">
                {t(porHora ? 'busqueda.ayudaPorHora' : 'busqueda.ayudaPorNoche')}
              </p>
            )}
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>{t(porHora ? 'busqueda.diaHorario' : 'busqueda.fechas')}</legend>
            {porHora ? (
              <>
                <label className="bs-campo-dia">
                  <span className="label">{t('busqueda.dia')}</span>
                  <input className="input" type="date" min={hoy} value={f.desde} onChange={(e) => cambiar('desde', e.target.value)} />
                </label>
                <div className="bs-precios">
                  <label>
                    <span className="label">{t('busqueda.campoDesde')}</span>
                    <select className="input" value={f.horaDesde} onChange={(e) => cambiarHoraDesde(e.target.value)}>
                      <option value="">{t('busqueda.cualquierHora')}</option>
                      {HORAS.slice(0, -1).map((h) => <option key={h} value={h}>{textoHora(h)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label">{t('busqueda.campoHasta')}</span>
                    <select className="input" value={f.horaHasta} disabled={!f.horaDesde} onChange={(e) => cambiar('horaHasta', e.target.value)}>
                      <option value="">—</option>
                      {HORAS.filter((h) => h > f.horaDesde).map((h) => <option key={h} value={h}>{textoHora(h)}</option>)}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <div className="bs-precios">
                <label>
                  <span className="label">{t(f.servicio === 'alojamiento' ? 'busqueda.entrada' : 'busqueda.campoDesde')}</span>
                  <input className="input" type="date" min={hoy} value={f.desde} onChange={(e) => cambiarEntrada(e.target.value)} />
                </label>
                <label>
                  <span className="label">{t(f.servicio === 'alojamiento' ? 'busqueda.salida' : 'busqueda.hastaOpcional')}</span>
                  <input className="input" type="date" min={f.desde || hoy} value={f.hasta} onChange={(e) => cambiar('hasta', e.target.value)} />
                </label>
              </div>
            )}
            {errorFecha && <p className="bs-error" role="alert">{errorFecha}</p>}
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>{t('busqueda.tipoMascota')}</legend>
            <Opciones opciones={TIPOS_MASCOTA} valor={f.tipo} onElegir={(v) => cambiar('tipo', v)} />
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>{t(f.servicio ? `busqueda.precioPor.${servicio(f.servicio).unidad}` : 'busqueda.precioAmbos')} ({moneda})</legend>
            <div className="bs-precios">
              <label>
                <span className="label">{t('busqueda.minimo')}</span>
                <input className="input" type="number" min="0" inputMode="numeric" placeholder="0"
                  value={f.precioMin} onChange={(e) => cambiar('precioMin', e.target.value)} />
              </label>
              <label>
                <span className="label">{t('busqueda.maximo')}</span>
                <input className="input" type="number" min="0" inputMode="numeric" placeholder={t('busqueda.sinLimite')}
                  value={f.precioMax} onChange={(e) => cambiar('precioMax', e.target.value)} />
              </label>
            </div>
            {errorPrecio && <p className="bs-error" role="alert">{t('busqueda.error.precio')}</p>}
          </fieldset>

          {conPunto && (
            <fieldset className="bs-grupo">
              <legend>{t('busqueda.distanciaMaxima')}</legend>
              <Opciones opciones={RADIOS_KM.map((km) => ({ valor: km, texto: t('busqueda.km', { n: km }) }))}
                valor={f.radioKm} onElegir={(v) => cambiar('radioKm', v)} />
            </fieldset>
          )}

          <fieldset className="bs-grupo">
            <legend>{t('busqueda.nombreCuidador')} <small>{t('busqueda.opcional')}</small></legend>
            <input className="input" type="search" placeholder={t('busqueda.ejemploNombre')} aria-label={t('busqueda.nombreCuidador')}
              value={f.q} onChange={(e) => cambiar('q', e.target.value)} />
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>{t('busqueda.ordenarPor')}</legend>
            <Opciones opciones={ORDENES.filter((o) => conPunto || !o.soloConPunto)} valor={f.orden} onElegir={(v) => cambiar('orden', v)} />
          </fieldset>
        </div>

        <div className="bs-hoja-acciones">
          <button type="button" className="bs-boton bs-boton--secundario" onClick={limpiar}>{t('busqueda.limpiar')}</button>
          <button type="button" className="bs-boton" disabled={errorPrecio || Boolean(errorFecha) || ubicando} onClick={() => onAplicar(f, zona)}>
            <IconLupa width="20" height="20" /> {t('busqueda.buscar')}
          </button>
        </div>
      </div>
    </div>
  );
}
