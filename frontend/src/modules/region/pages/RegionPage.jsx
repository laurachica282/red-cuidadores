import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Pantalla from '../components/Pantalla.jsx';
import { IDIOMAS, guardarRegionLocal, useIdioma } from '../i18n/i18n.js';
import { guardarMiRegion, listarPaises, obtenerMiRegion } from '../services/regionService.js';

// Mockup "Idioma, país y moneda" (HU-34): tres selectores, aviso y botón Guardar fijo abajo.
export default function RegionPage() {
  const { t } = useIdioma();
  const [paises, setPaises] = useState([]);
  const [pais, setPais] = useState('');
  const [idioma, setIdioma] = useState('es');
  const [moneda, setMoneda] = useState('COP');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarPaises(), obtenerMiRegion()])
      .then(([lista, mia]) => {
        if (!vivo) return;
        setPaises(lista);
        setPais(mia.pais.trim());
        setIdioma(mia.idioma);
        setMoneda(mia.moneda.trim());
      })
      .catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  const monedas = [...new Set(paises.map((p) => p.moneda.trim()))];

  // El idioma y la moneda por defecto salen del país; la persona puede cambiarlos después.
  const elegirPais = (codigo) => {
    setPais(codigo);
    const nuevo = paises.find((p) => p.pais === codigo);
    if (nuevo) { setIdioma(nuevo.idioma); setMoneda(nuevo.moneda.trim()); }
    setOk(false);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk(false);
    setGuardando(true);
    try {
      guardarRegionLocal(await guardarMiRegion({ pais, idioma, moneda }));
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Pantalla titulo={t('region.titulo')} sub={t('region.sub')} atras="/inicio" pie={
      <button type="submit" form="region-form" className="btn-primary" disabled={guardando || !pais}>
        {guardando ? t('comun.guardando') : t('comun.guardar')}
      </button>
    }>
      <form id="region-form" className="rg-form" onSubmit={guardar}>
        <div>
          <label className="label" htmlFor="idioma">{t('region.idioma')}</label>
          <div className="rg-select">
            <select id="idioma" className="input" value={idioma} onChange={(e) => { setIdioma(e.target.value); setOk(false); }}>
              {IDIOMAS.map((i) => <option key={i} value={i}>{t(`idioma.${i}`)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pais">{t('region.pais')}</label>
          <div className="rg-select">
            <select id="pais" className="input" value={pais} onChange={(e) => elegirPais(e.target.value)} required>
              {paises.map((p) => <option key={p.pais} value={p.pais}>{p.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="moneda">{t('region.moneda')}</label>
          <div className="rg-select">
            <select id="moneda" className="input" value={moneda} onChange={(e) => { setMoneda(e.target.value); setOk(false); }}>
              {monedas.map((m) => <option key={m} value={m}>{t(`moneda.${m}`)}</option>)}
            </select>
          </div>
        </div>

        <div className="rg-caja">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
          </svg>
          <p>{t('region.aviso')}</p>
        </div>

        {error && <p className="rg-error" role="alert">{error}</p>}
        {ok && <p className="rg-exito" role="status">{t('region.guardada')}</p>}
        <Link className="rg-enlace" to="/terminos">{t('region.terminos')}</Link>
      </form>
    </Pantalla>
  );
}
