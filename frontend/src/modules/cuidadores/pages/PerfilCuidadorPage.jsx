import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import { IconCamara, IconMas, IconX } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { guardarMiPerfil, obtenerMiPerfil, quitarFoto, subirFotos, urlFoto } from '../services/cuidadoresService.js';

const TIPOS = ['perro', 'gato', 'ave', 'conejo', 'otro'];
const MAX_FOTOS = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];

// Servicios y unidad de cobro (backend/src/shared/servicios.js): alojamiento por noche; los demás por hora.
const SERVICIOS = [
  { servicio: 'alojamiento', unidad: 'noche' },
  { servicio: 'domicilio', unidad: 'hora' },
  { servicio: 'paseo', unidad: 'hora' },
  { servicio: 'guarderia', unidad: 'hora' },
];

// HU-10: el cuidador arma su perfil (fotos del espacio, servicios con su precio y tipos de mascota).
export default function PerfilCuidadorPage() {
  const { usuario } = useAuth();
  const { t } = useIdioma();
  const [descripcion, setDescripcion] = useState('');
  // { alojamiento: { ofrece, tarifa }, ... }
  const [servicios, setServicios] = useState(() =>
    Object.fromEntries(SERVICIOS.map((x) => [x.servicio, { ofrece: x.servicio === 'alojamiento', tarifa: '' }])));
  const [tipos, setTipos] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const entrada = useRef(null);

  useEffect(() => {
    let vivo = true;
    obtenerMiPerfil()
      .then((d) => {
        if (!vivo) return;
        if (d.perfil) {
          setDescripcion(d.perfil.descripcion);
          setServicios(Object.fromEntries(SERVICIOS.map((x) => {
            const s = d.servicios?.find((y) => y.servicio === x.servicio);
            // Perfil viejo sin servicios: el alojamiento con su tarifa por noche.
            if (!d.servicios && x.servicio === 'alojamiento') return [x.servicio, { ofrece: true, tarifa: String(d.perfil.tarifaNoche) }];
            return [x.servicio, { ofrece: Boolean(s?.ofrece), tarifa: s?.tarifa ? String(s.tarifa) : '' }];
          })));
          setTipos(d.perfil.tiposMascota);
        }
        setFotos(d.fotos);
      })
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, []);

  const cambiarServicio = (servicio, cambio) => {
    setOk(false);
    setServicios((prev) => ({ ...prev, [servicio]: { ...prev[servicio], ...cambio } }));
  };

  const alternarTipo = (tipo) => {
    setOk(false);
    setTipos((prev) => (prev.includes(tipo) ? prev.filter((x) => x !== tipo) : [...prev, tipo]));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk(false);
    const elegidos = SERVICIOS.filter((x) => servicios[x.servicio].ofrece);
    if (elegidos.length === 0 || !elegidos.every((x) => Number(servicios[x.servicio].tarifa) > 0)) {
      return setError(t('perfil.elige_servicio'));
    }
    if (tipos.length === 0) return setError(t('perfil.elige_tipo'));
    setGuardando(true);
    try {
      await guardarMiPerfil({
        descripcion,
        tiposMascota: tipos,
        servicios: elegidos.map((x) => ({ servicio: x.servicio, tarifa: Number(servicios[x.servicio].tarifa) })),
      });
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const agregarFotos = async (e) => {
    const elegidas = [...e.target.files];
    e.target.value = '';
    if (elegidas.length === 0) return;
    setError('');
    if (fotos.length + elegidas.length > MAX_FOTOS) return setError(t('perfil.max_fotos'));
    if (!elegidas.every((f) => IMAGENES.includes(f.type) && f.size <= MAX_BYTES)) return setError(t('perfil.foto_invalida'));
    setSubiendo(true);
    try {
      await subirFotos(elegidas);
      setFotos((await obtenerMiPerfil()).fotos); // solo se refrescan las fotos; el formulario queda como está
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarFoto = async (id) => {
    setError('');
    try {
      await quitarFoto(id);
      setFotos((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Pantalla titulo={t('perfil.titulo')} sub={t('perfil.sub')} atras="/cuidador" pie={
      <button type="submit" form="perfil-form" className="btn-primary" disabled={guardando || cargando}>
        {guardando ? t('comun.guardando') : t('perfil.guardar')}
      </button>
    }>
      {cargando ? <p className="cd-sub">{t('comun.cargando')}</p> : (
        <form id="perfil-form" className="cd-form" onSubmit={guardar}>
          <div>
            <label className="label" htmlFor="descripcion">{t('perfil.descripcion')}</label>
            <textarea id="descripcion" className="input cd-textarea" rows={4} maxLength={1000}
              placeholder={t('perfil.descripcion_ph')} value={descripcion}
              onChange={(e) => { setDescripcion(e.target.value); setOk(false); }} />
          </div>

          <fieldset className="cd-grupo">
            <legend className="label">{t('perfil.servicios')}</legend>
            <div className="cd-servicios">
              {SERVICIOS.map(({ servicio, unidad }) => {
                const s = servicios[servicio];
                return (
                  <div key={servicio} className={`cd-servicio${s.ofrece ? ' cd-servicio--activo' : ''}`}>
                    <label className="cd-servicio-nombre">
                      <input type="checkbox" checked={s.ofrece} onChange={(e) => cambiarServicio(servicio, { ofrece: e.target.checked })} />
                      {t(`servicio.${servicio}`)}
                    </label>
                    <div className="cd-moneda">
                      <input className="input" type="number" inputMode="numeric" min="1" step="any" disabled={!s.ofrece}
                        aria-label={`${t(`servicio.${servicio}`)} ${t(unidad === 'noche' ? 'perfil.por_noche' : 'perfil.por_hora')}`}
                        placeholder={unidad === 'noche' ? '45000' : '12000'} value={s.tarifa}
                        onChange={(e) => cambiarServicio(servicio, { tarifa: e.target.value })} />
                      <span className="cd-moneda-codigo">{usuario.moneda ?? 'COP'} {t(unidad === 'noche' ? 'perfil.por_noche' : 'perfil.por_hora')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="cd-ayuda">{t('perfil.servicios_ayuda')}</p>
          </fieldset>

          <fieldset className="cd-grupo">
            <legend className="label">{t('perfil.tipos')}</legend>
            <div className="cd-tipos">
              {TIPOS.map((tipo) => (
                <button key={tipo} type="button" aria-pressed={tipos.includes(tipo)}
                  className={`cd-tipo${tipos.includes(tipo) ? ' cd-tipo-activo' : ''}`} onClick={() => alternarTipo(tipo)}>
                  {t(`tipo.${tipo}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <span className="label">{t('perfil.fotos')}</span>
            <div className="cd-fotos">
              {fotos.map((f) => (
                <div className="cd-foto" key={f.id}>
                  <img src={urlFoto(f.id)} alt={t('perfil.foto_alt')} loading="lazy" />
                  <button type="button" className="cd-quitar" aria-label={t('perfil.quitar')} onClick={() => eliminarFoto(f.id)}>
                    <IconX />
                  </button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <button type="button" className="cd-agregar" disabled={subiendo} onClick={() => entrada.current.click()}>
                  {subiendo ? <span>{t('perfil.subiendo')}</span> : (<><IconCamara /><span><IconMas width="14" height="14" /> {t('perfil.agregar')}</span></>)}
                </button>
              )}
            </div>
            <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={agregarFotos} />
            <p className="cd-ayuda">{t('perfil.fotos_ayuda')}</p>
          </div>

          {error && <p className="cd-error" role="alert">{error}</p>}
          {ok && <p className="cd-exito" role="status">{t('perfil.guardado')}</p>}

          <p className="cd-ayuda cd-centro">{t('perfil.nota')}</p>
        </form>
      )}
    </Pantalla>
  );
}
