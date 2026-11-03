import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { InsigniaAntecedentes } from '@/modules/cuidadores';
import { useIdioma } from '@/modules/region';
import { obtenerPerfilCuidador, urlApi, urlFotoCuidador } from '../services/busquedaService.js';
import { IconAtras, IconCasa, IconEstrella } from '../components/Iconos.jsx';
import { TIPOS_MASCOTA, formatoCalificacion, iniciales, noches, rangoFechas, servicio, tiempoEnLaRed } from '../utils.js';
import '../busqueda.css';

const nombreTipo = (v) => TIPOS_MASCOTA.find((t) => t.valor === v)?.texto ?? v;

// HU-16 · mockup 2: fotos, reseñas, insignia de antecedentes y tarifa.
export default function PerfilCuidadorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { precio, fecha } = useIdioma();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [fotoActiva, setFotoActiva] = useState(0);

  useEffect(() => {
    let vivo = true;
    obtenerPerfilCuidador(id).then((d) => vivo && setC(d)).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [id]);

  const volver = () => (window.history.length > 1 ? navigate(-1) : navigate('/inicio'));

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

  const desde = params.get('desde');
  const hasta = params.get('hasta');
  const n = noches(desde, hasta);
  const km = params.get('km');

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
            <InsigniaAntecedentes venceEn={c.antecedentesVencenEn} />
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
            {c.servicios.map((s) => (
              <li key={s.servicio}>
                <span>{servicio(s.servicio).texto}</span>
                <span><strong>{precio(s.tarifa, c.moneda)}</strong> <small>/{s.unidad}</small></span>
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
          <small className="bs-sub">{n > 0 ? `${rangoFechas(desde, hasta)} · ${n} ${n === 1 ? 'noche' : 'noches'}` : 'Alojamiento desde'}</small>
          <p>
            <strong>{precio(n > 0 ? c.tarifaNoche * n : c.tarifaNoche, c.moneda)}</strong>{' '}
            <small>{n > 0 ? 'total' : '/noche'}</small>
          </p>
        </div>
        {/* La solicitud de reserva es HU-17 (módulo reservas). */}
        <button type="button" className="bs-boton" disabled title="Disponible cuando esté el módulo de reservas">Reservar</button>
      </div>
    </main>
  );
}
