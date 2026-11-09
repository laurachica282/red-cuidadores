import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import { obtenerPerfilCuidador, urlApi, urlFotoCuidador } from '../services/busquedaService.js';
import { IconAtras, IconCasa, IconEstrella } from '../components/Iconos.jsx';
import InsigniaVerificado from '../components/InsigniaVerificado.jsx';
import { TIPOS_MASCOTA, formatoCalificacion, iniciales, noches, rangoFechas, servicio, tiempoEnLaRed } from '../utils.js';
import '../busqueda.css';

const nombreTipo = (v) => TIPOS_MASCOTA.find((t) => t.valor === v)?.texto ?? v;

// Unidades a cobrar, con la misma cuenta del módulo reservas: alojamiento por noche, lo demás por día.
const unidades = (servicioElegido, n) => (servicioElegido === 'alojamiento' ? n : n + 1);

// HU-16 · mockup 2: fotos, reseñas, insignia de antecedentes y tarifa.
export default function PerfilCuidadorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { precio, fecha } = useIdioma();
  const { usuario } = useAuth();
  const desde = params.get('desde');
  const hasta = params.get('hasta');
  const [c, setC] = useState(null);
  // Servicio que se va a reservar; por defecto el que venía de la búsqueda.
  const [elegido, setElegido] = useState(params.get('servicio'));
  const [error, setError] = useState('');
  const [fotoActiva, setFotoActiva] = useState(0);

  useEffect(() => {
    let vivo = true;
    obtenerPerfilCuidador(id, { desde, hasta }).then((d) => vivo && setC(d)).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [id, desde, hasta]);

  // Se retrocede solo si se llegó desde la búsqueda; si no (enlace directo, desde la reserva...) se va a la búsqueda.
  const volver = () => (location.state?.desdeBusqueda ? navigate(-1) : navigate('/inicio'));

  if (error) {
    return (
      <main className="page bs-page">
        <button type="button" className="bs-redondo" aria-label="Volver" onClick={volver}><IconAtras /></button>
        <p className="bs-error" role="alert">{error}</p>
        <Link className="bs-enlace" to="/inicio">Volver a la búsqueda</Link>
      </main>
    );
  }
  if (!c) return <main className="page bs-page"><p className="bs-sub">Cargando perfil…</p></main>;

  const n = noches(desde, hasta);
  const km = params.get('km');
  const s = c.servicios.find((x) => x.servicio === elegido) ?? c.servicios[0];
  const cantidad = n > 0 && s ? unidades(s.servicio, n) : 0;
  const ocupado = c.disponible === false;
  const puedeReservar = usuario?.rol === 'viajero' && s && !ocupado;
  const qs = new URLSearchParams({ ...(s && { servicio: s.servicio }), ...(n > 0 && { desde, hasta }) }).toString();
  let leyenda = s ? `${servicio(s.servicio).texto} desde` : 'Sin servicios';
  if (cantidad > 0) leyenda = `${rangoFechas(desde, hasta)} · ${cantidad} × ${s.unidad}`;
  if (ocupado) leyenda = 'No está disponible en esas fechas';

  return (
    <main className="bs-perfil">
      <div className="bs-portada">
        {c.fotos.length > 0
          ? <img src={urlFotoCuidador(c.fotos[fotoActiva])} alt={`Espacio de ${c.nombre}`} />
          : <IconCasa width="72" height="72" className="bs-portada-icono" />}
        <button type="button" className="bs-redondo bs-redondo--flotante" aria-label="Volver" onClick={volver}><IconAtras /></button>
      </div>

      <div className="bs-perfil-cuerpo">
        <div className="bs-perfil-cabecera">
          <span className="bs-avatar bs-avatar--grande">
            {c.fotoPerfil ? <img src={urlApi(c.fotoPerfil)} alt={`Foto de ${c.nombre}`} /> : iniciales(c.nombre)}
          </span>
          <div>
            <h1>{c.nombre}</h1>
            <p className="bs-sub">{[c.barrio ?? c.ciudad, km ? `a ${km.replace('.', ',')} km` : null].filter(Boolean).join(' · ')}</p>
            <InsigniaVerificado venceEn={c.antecedentesVencenEn} nombre={c.nombre.split(' ')[0]} />
          </div>
        </div>

        <div className="bs-stats">
          <div>
            <strong>
              {c.calificacion !== null && <IconEstrella width="18" height="18" className="bs-estrella" />}
              {c.calificacion !== null ? formatoCalificacion(c.calificacion) : '—'}
            </strong>
            <small>Calificación</small>
          </div>
          <div><strong>{c.totalResenas}</strong><small>Reseñas</small></div>
          <div><strong>{tiempoEnLaRed(c.enLaRedDesde)}</strong><small>En la red</small></div>
        </div>

        {c.fotos.length > 1 && (
          <section>
            <h2>Fotos del espacio</h2>
            <div className="bs-miniaturas">
              {c.fotos.map((f, i) => (
                <button key={f} type="button" aria-label={`Foto ${i + 1}`} aria-pressed={i === fotoActiva}
                  className={`bs-miniatura${i === fotoActiva ? ' bs-miniatura--activa' : ''}`} onClick={() => setFotoActiva(i)}>
                  <img src={urlFotoCuidador(f)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {c.descripcion && (
          <section>
            <h2>Sobre mí</h2>
            <p className="bs-texto">{c.descripcion}</p>
          </section>
        )}

        <section>
          <h2>Servicios</h2>
          <ul className="bs-servicios">
            {c.servicios.map((x) => (
              <li key={x.servicio}>
                <button type="button" aria-pressed={x.servicio === s?.servicio}
                  className={`bs-servicio${x.servicio === s?.servicio ? ' bs-servicio--activo' : ''}`} onClick={() => setElegido(x.servicio)}>
                  <span>{servicio(x.servicio).texto}</span>
                  <span><strong>{precio(x.tarifa, c.moneda)}</strong> <small>/{x.unidad}</small></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="bs-etiquetas">
            <small className="bs-sub">Acepta:</small>
            {c.tiposMascota.map((t) => <span key={t} className="bs-etiqueta">{nombreTipo(t)}</span>)}
          </div>
        </section>

        <section>
          <h2>Reseñas</h2>
          {c.resenas.length === 0 && <p className="bs-sub">Este cuidador aún no tiene reseñas.</p>}
          <ul className="bs-resenas">
            {c.resenas.map((r) => (
              <li key={r.id} className="bs-resena">
                <div className="bs-card-fila">
                  <strong>{r.autor}</strong>
                  <span className="bs-estrellas" aria-label={`${r.calificacion} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <IconEstrella key={i} width="14" height="14" className={i <= r.calificacion ? 'bs-estrella' : 'bs-estrella--vacia'} />
                    ))}
                  </span>
                </div>
                {r.comentario && <p className="bs-texto">{r.comentario}</p>}
                <small className="bs-sub">{fecha(r.fecha)}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="bs-reservar">
        <div>
          <small className={ocupado ? 'bs-error' : 'bs-sub'}>{leyenda}</small>
          {s && (
            <p>
              <strong>{precio(cantidad > 0 ? s.tarifa * cantidad : s.tarifa, c.moneda)}</strong>{' '}
              <small>{cantidad > 0 ? 'total' : `/${s.unidad}`}</small>
            </p>
          )}
        </div>
        {/* La solicitud la hace el módulo reservas (HU-17); se le pasa el servicio y las fechas. */}
        {puedeReservar ? (
          <Link className="bs-boton" to={`/reservas/nueva/${c.id}${qs ? `?${qs}` : ''}`} state={{ desdePerfil: true }}>Reservar</Link>
        ) : (
          <button type="button" className="bs-boton" disabled
            title={ocupado ? 'Elige otras fechas' : 'Solo los viajeros pueden reservar'}>Reservar</button>
        )}
      </div>
    </main>
  );
}
