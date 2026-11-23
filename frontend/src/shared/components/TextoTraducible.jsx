import { useState } from 'react';
import { useIdioma } from '@/modules/region';
import { traducirTexto } from '../api/traductor.js';
import './TextoTraducible.css';

// Texto escrito por una persona (ej. una reseña) con botón "Traducir" / "Ver original".
// Se traduce solo cuando la persona lo pide; el original siempre queda a un clic.
export default function TextoTraducible({ texto, className = '' }) {
  const { t, idioma, locale } = useIdioma();
  const [estado, setEstado] = useState({ idioma: null, traduccion: null, origen: null, aviso: null });
  const [verOriginal, setVerOriginal] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Si cambia el idioma de la app, la traducción anterior ya no sirve.
  const vigente = estado.idioma === idioma ? estado : { traduccion: null, origen: null, aviso: null };
  const mostrandoTraduccion = vigente.traduccion && !verOriginal;

  const traducir = async () => {
    setCargando(true);
    try {
      const r = await traducirTexto(texto, idioma);
      setEstado(r.mismoIdioma
        ? { idioma, traduccion: null, origen: null, aviso: 'traduccion.mismo_idioma' }
        : { idioma, traduccion: r.texto, origen: r.origen, aviso: null });
      setVerOriginal(false);
    } catch {
      setEstado({ idioma, traduccion: null, origen: null, aviso: 'traduccion.error' });
    } finally {
      setCargando(false);
    }
  };

  let nombreOrigen = vigente.origen;
  try { if (vigente.origen) nombreOrigen = new Intl.DisplayNames([locale], { type: 'language' }).of(vigente.origen); } catch { /* código tal cual */ }

  return (
    <div className="tt">
      <p className={className}>{mostrandoTraduccion ? vigente.traduccion : texto}</p>
      <div className="tt-pie">
        {mostrandoTraduccion && <span className="tt-nota">{t('traduccion.traducido_de', { idioma: nombreOrigen })}</span>}
        {vigente.aviso && !vigente.traduccion && <span className="tt-nota">{t(vigente.aviso)}</span>}
        {vigente.traduccion ? (
          <button type="button" className="tt-boton" onClick={() => setVerOriginal((v) => !v)}>
            {verOriginal ? t('traduccion.ver_traduccion') : t('traduccion.ver_original')}
          </button>
        ) : vigente.aviso !== 'traduccion.mismo_idioma' && (
          <button type="button" className="tt-boton" onClick={traducir} disabled={cargando}>
            {cargando ? t('traduccion.traduciendo') : t('traduccion.traducir')}
          </button>
        )}
      </div>
    </div>
  );
}
