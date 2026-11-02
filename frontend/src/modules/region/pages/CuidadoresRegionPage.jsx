import { useEffect, useMemo, useState } from 'react';
import Pantalla from '../components/Pantalla.jsx';
import { useIdioma } from '../i18n/i18n.js';
import { listarCuidadoresDeMiRegion, urlFotoCuidador } from '../services/regionService.js';

const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('');

// HU-36: la lista se limita a la región de la persona. Tarjetas como "Cerca de ti" en los mockups.
export default function CuidadoresRegionPage() {
  const { t, precio } = useIdioma();
  const [lista, setLista] = useState(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    listarCuidadoresDeMiRegion().then((d) => vivo && setLista(d)).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return (lista ?? []).filter((c) => !q || `${c.nombre} ${c.ciudad ?? ''}`.toLowerCase().includes(q));
  }, [lista, texto]);

  return (
    <Pantalla titulo={t('cr.titulo')} sub={t('cr.sub')} atras="/inicio">
      <input className="input rg-buscar" type="search" placeholder={t('cr.buscar')} aria-label={t('cr.buscar')}
        value={texto} onChange={(e) => setTexto(e.target.value)} />

      {error && <p className="rg-error" role="alert">{error}</p>}
      {!lista && !error && <p className="rg-sub">{t('comun.cargando')}</p>}
      {lista && visibles.length > 0 && <p className="rg-cantidad">{visibles.length === 1 ? t('cr.una') : t('cr.cantidad', { n: visibles.length })}</p>}
      {lista && visibles.length === 0 && <p className="rg-vacio">{t('cr.vacio')}</p>}

      <ul className="rg-cards">
        {visibles.map((c) => (
          <li key={c.id} className="rg-card">
            <span className="rg-card-foto">
              {c.fotoId ? <img src={urlFotoCuidador(c.fotoId)} alt="" loading="lazy" /> : iniciales(c.nombre)}
            </span>
            <div className="rg-card-texto">
              <div className="rg-card-fila">
                <strong>{c.nombre}</strong>
                <span className="rg-precio">{precio(c.tarifaNoche, c.moneda)} <small>{t('cr.noche')}</small></span>
              </div>
              <small>{c.ciudad ?? c.pais}</small>
              <span className="rg-verificado">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" />
                </svg>
                {t('cr.verificado')}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Pantalla>
  );
}
