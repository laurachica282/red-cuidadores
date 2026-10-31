import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth';
import Pantalla from '../components/Pantalla.jsx';
import { useIdioma } from '../i18n/i18n.js';
import { listarPaises, obtenerTerminos } from '../services/regionService.js';

// HU-36: los términos legales cambian según el país. Es pública (también sirve desde el registro).
export default function TerminosPage() {
  const { t } = useIdioma();
  const { usuario } = useAuth();
  const [paises, setPaises] = useState([]);
  const [pais, setPais] = useState(usuario?.pais ?? 'CO');
  const [terminos, setTerminos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { listarPaises().then(setPaises).catch(() => {}); }, []);

  useEffect(() => {
    let vivo = true;
    obtenerTerminos(pais)
      .then((d) => { if (vivo) { setTerminos(d); setError(''); } })
      .catch(() => { if (vivo) { setTerminos(null); setError(t('terminos.error')); } });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pais]);

  return (
    <Pantalla titulo={t('terminos.titulo')} sub={t('terminos.sub')} atras={usuario ? '/configuracion/region' : '/login'}>
      <div className="rg-form">
        <div>
          <label className="label" htmlFor="pais-terminos">{t('terminos.pais')}</label>
          <select id="pais-terminos" className="input" value={pais} onChange={(e) => setPais(e.target.value)}>
            {paises.map((p) => <option key={p.pais} value={p.pais}>{p.nombre}</option>)}
          </select>
        </div>

        {error && <p className="rg-error" role="alert">{error}</p>}
        {terminos && (
          <article className="rg-terminos">
            <h2>{terminos.titulo}</h2>
            <p>{terminos.texto}</p>
          </article>
        )}
      </div>
    </Pantalla>
  );
}
