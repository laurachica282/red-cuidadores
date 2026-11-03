import { useEffect, useState } from 'react';
import { IconCerrar, IconLupa } from './Iconos.jsx';
import MapaDireccion from './MapaDireccion.jsx';
import { SERVICIOS, TIPOS_MASCOTA, hoyISO, servicio } from '../utils.js';
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
  const ubicando = zona.punto?.etiqueta === 'Ubicando…';
  const opcionesZona = [
    ...ciudades.map((c) => ({ valor: c.nombre, texto: `${c.nombre} (${c.cantidad})` })),
    { valor: 'todas', texto: `Todo ${pais ?? 'el país'}` },
  ];
  const cambiarEntrada = (valor) => setF((a) => ({ ...a, desde: valor, hasta: a.hasta && valor >= a.hasta ? '' : a.hasta }));

  return (
    <div className="bs-capa">
      <button type="button" className="bs-capa-fondo" aria-label="Cerrar filtros" onClick={onCerrar} />
      <div className="bs-hoja" role="dialog" aria-modal="true" aria-labelledby="bs-filtros-titulo">
        <div className="bs-hoja-cabecera">
          <h2 id="bs-filtros-titulo">Buscar cuidador</h2>
          <button type="button" className="bs-redondo bs-redondo--chico" aria-label="Cerrar" onClick={onCerrar}><IconCerrar /></button>
        </div>
        <div className="bs-hoja-cuerpo">
          <fieldset className="bs-grupo bs-grupo--primero">
            <legend>Zona</legend>
            <MapaDireccion key={versionMapa} valor={zona.punto} onCambiar={elegirLugar}
              placeholder="Ciudad, barrio o dirección" />
            <p className="bs-ayuda">O busca en toda una ciudad:</p>
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
            </div>
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>Tipo de servicio</legend>
            <Opciones opciones={[{ valor: '', texto: 'Todos' }, ...SERVICIOS.map((s) => ({ valor: s.valor, texto: s.corto ?? s.texto }))]}
              valor={f.servicio} onElegir={(v) => cambiar('servicio', v)} />
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>Fechas</legend>
            <div className="bs-precios">
              <label>
                <span className="label">Entrada</span>
                <input className="input" type="date" min={hoy} value={f.desde} onChange={(e) => cambiarEntrada(e.target.value)} />
              </label>
              <label>
                <span className="label">Salida</span>
                <input className="input" type="date" min={f.desde || hoy} value={f.hasta} onChange={(e) => cambiar('hasta', e.target.value)} />
              </label>
            </div>
            {errorFecha && <p className="bs-error" role="alert">{errorFecha}</p>}
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>Tipo de mascota</legend>
            <Opciones opciones={TIPOS_MASCOTA} valor={f.tipo} onElegir={(v) => cambiar('tipo', v)} />
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>{f.servicio ? `Precio por ${servicio(f.servicio).unidad}` : 'Precio del servicio'} ({moneda})</legend>
            <div className="bs-precios">
              <label>
                <span className="label">Mínimo</span>
                <input className="input" type="number" min="0" inputMode="numeric" placeholder="0"
                  value={f.precioMin} onChange={(e) => cambiar('precioMin', e.target.value)} />
              </label>
              <label>
                <span className="label">Máximo</span>
                <input className="input" type="number" min="0" inputMode="numeric" placeholder="Sin límite"
                  value={f.precioMax} onChange={(e) => cambiar('precioMax', e.target.value)} />
              </label>
            </div>
            {errorPrecio && <p className="bs-error" role="alert">El mínimo no puede ser mayor que el máximo.</p>}
          </fieldset>

          {conPunto && (
            <fieldset className="bs-grupo">
              <legend>Distancia máxima</legend>
              <Opciones opciones={RADIOS_KM.map((km) => ({ valor: km, texto: `${km} km` }))}
                valor={f.radioKm} onElegir={(v) => cambiar('radioKm', v)} />
            </fieldset>
          )}

          <fieldset className="bs-grupo">
            <legend>Nombre del cuidador <small>(opcional)</small></legend>
            <input className="input" type="search" placeholder="Ej.: Camila" aria-label="Nombre del cuidador"
              value={f.q} onChange={(e) => cambiar('q', e.target.value)} />
          </fieldset>

          <fieldset className="bs-grupo">
            <legend>Ordenar por</legend>
            <Opciones opciones={ORDENES.filter((o) => conPunto || !o.soloConPunto)} valor={f.orden} onElegir={(v) => cambiar('orden', v)} />
          </fieldset>
        </div>

        <div className="bs-hoja-acciones">
          <button type="button" className="bs-boton bs-boton--secundario" onClick={limpiar}>Limpiar</button>
          <button type="button" className="bs-boton" disabled={errorPrecio || Boolean(errorFecha) || ubicando} onClick={() => onAplicar(f, zona)}>
            <IconLupa width="20" height="20" /> Buscar
          </button>
        </div>
      </div>
    </div>
  );
}
