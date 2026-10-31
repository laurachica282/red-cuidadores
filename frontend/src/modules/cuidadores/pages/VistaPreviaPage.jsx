import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import InsigniaAntecedentes from '../components/InsigniaAntecedentes.jsx';
import { IconCasa, IconFlecha } from '../components/Iconos.jsx';
import { obtenerMiPerfil, urlFoto } from '../services/cuidadoresService.js';
import '../cuidadores.css';

const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('');

// Así ven los viajeros el perfil del cuidador (basado en el perfil de Camila Rojas de los mockups).
export default function VistaPreviaPage() {
  const { usuario } = useAuth();
  const { t, precio } = useIdioma();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    obtenerMiPerfil().then((d) => vivo && setDatos(d)).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  const perfil = datos?.perfil;
  const verificado = datos?.verificacion.estado === 'aprobado';

  return (
    <div className="cd-fondo">
      <main className="cd">
        <header className="cd-cab">
          <Link className="cd-atras" to="/cuidador" aria-label={t('comun.volver')}><IconFlecha /></Link>
          <h1>{t('prev.titulo')}</h1>
        </header>
        <p className="cd-sub">{t('prev.nota')}</p>
        {error && <p className="cd-error" role="alert">{error}</p>}
        {!datos && !error && <p className="cd-sub">{t('comun.cargando')}</p>}

        {datos && (
          <>
            <div className="cd-hero">
              {datos.fotos[0] ? <img src={urlFoto(datos.fotos[0].id)} alt="" /> : <IconCasa />}
            </div>
            <section className="cd-perfil">
              <div className="cd-perfil-cab">
                <span className="cd-avatar">{iniciales(usuario.nombre)}</span>
                <div>
                  <h2>{usuario.nombre}</h2>
                  <small>{usuario.ciudad ?? ''}</small>
                  {verificado
                    ? <InsigniaAntecedentes venceEn={datos.verificacion.venceEn} />
                    : <span className="cd-chip cd-chip-sin_enviar">{t('prev.sin_verificar')}</span>}
                </div>
              </div>

              <div className="cd-bloque">
                <h3>{t('prev.sobre')}</h3>
                <p>{perfil?.descripcion || t('prev.sin_descripcion')}</p>
              </div>

              {perfil && (
                <div className="cd-bloque">
                  <h3>{t('prev.tipos')}</h3>
                  <div className="cd-tipos">
                    {perfil.tiposMascota.map((x) => <span key={x} className="cd-tipo-fijo">{t(`tipo.${x}`)}</span>)}
                  </div>
                </div>
              )}

              <div className="cd-bloque">
                <h3>{t('prev.servicios')}</h3>
                <div className="cd-lista">
                  <div className="cd-servicio">
                    <span>{t('prev.alojamiento')}</span>
                    <strong>{perfil ? <>{precio(perfil.tarifaNoche, usuario.moneda)} <small>{t('prev.noche')}</small></> : '—'}</strong>
                  </div>
                </div>
                {!perfil && <p className="cd-ayuda">{t('prev.sin_tarifa')}</p>}
              </div>

              {datos.fotos.length > 1 && (
                <div className="cd-bloque">
                  <h3>{t('prev.fotos')}</h3>
                  <div className="cd-fotos">
                    {datos.fotos.slice(1).map((f) => (
                      <div className="cd-foto" key={f.id}><img src={urlFoto(f.id)} alt="" loading="lazy" /></div>
                    ))}
                  </div>
                </div>
              )}
            </section>
            {perfil && (
              <div className="cd-barra">
                <div><small>{t('prev.desde')}</small><strong>{precio(perfil.tarifaNoche, usuario.moneda)} <small>{t('prev.noche')}</small></strong></div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
