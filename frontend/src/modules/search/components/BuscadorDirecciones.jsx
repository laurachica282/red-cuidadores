import { useEffect, useState } from 'react';
import { buscarDirecciones } from '../services/busquedaService.js';
import { CENTRO_POR_DEFECTO } from '../ubicacion.js';
import { IconLupa } from './Iconos.jsx';

// Campo para escribir una ciudad, barrio o dirección, con sugerencias mientras se escribe.
// texto/onTexto: lo escrito (lo controla quien lo usa). onElegir: { etiqueta, barrio, ciudad, lat, lng }.
// cerca: { lat, lng } para preferir lugares de esa zona.
export default function BuscadorDirecciones({ texto, onTexto, onElegir, placeholder, cerca = CENTRO_POR_DEFECTO }) {
  const [consulta, setConsulta] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [error, setError] = useState('');

  // Busca con una pausa para no consultar en cada tecla.
  useEffect(() => {
    if (consulta.trim().length < 3) return undefined;
    let vivo = true;
    const id = setTimeout(() => {
      buscarDirecciones(consulta.trim(), cerca)
        .then((d) => {
          if (!vivo) return;
          setSugerencias(d.resultados);
          setError(d.resultados.length ? '' : 'No encontramos ese lugar. Prueba con el barrio o una calle cercana.');
        })
        .catch((e) => vivo && setError(e.message));
    }, 600);
    return () => { vivo = false; clearTimeout(id); };
    // Solo se busca de nuevo al escribir, no cuando cambia la zona preferida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta]);

  const escribir = (t) => {
    onTexto(t);
    setConsulta(t);
    setError('');
    if (t.trim().length < 3) setSugerencias([]);
  };

  const elegir = (d) => {
    onTexto(d.etiqueta);
    setConsulta('');
    setSugerencias([]);
    onElegir(d);
  };

  return (
    <div className="bs-autocompletar">
      <label className="bs-campo">
        <IconLupa className="bs-campo-icono" />
        <input type="search" value={texto} placeholder={placeholder} aria-label={placeholder}
          onChange={(e) => escribir(e.target.value)} autoComplete="off" />
      </label>
      {sugerencias.length > 0 && (
        <ul className="bs-menu bs-menu--ancho" role="listbox" aria-label="Lugares encontrados">
          {sugerencias.map((s) => {
            const [principal, ...resto] = s.etiqueta.split(', ');
            return (
              <li key={`${s.lat},${s.lng}`} role="option" aria-selected={false}>
                <button type="button" className="bs-menu-item" onClick={() => elegir(s)}>
                  <span className="bs-menu-texto">
                    <strong>{principal}</strong>
                    {resto.length > 0 && <small>{resto.join(', ')}</small>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="bs-error" role="alert">{error}</p>}
    </div>
  );
}
