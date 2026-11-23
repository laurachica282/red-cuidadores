import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarMascotas, eliminarMascota, urlArchivo } from '../services/mascotasService.js';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import '../mascotas.css';

function textoEdad(meses, t) {
  if (meses == null) return null;
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  const partes = [];
  if (a) partes.push(t(a === 1 ? 'mascotas.edad.anio' : 'mascotas.edad.anios', { n: a }));
  if (m || !a) partes.push(t(m === 1 ? 'mascotas.edad.mes' : 'mascotas.edad.meses', { n: m }));
  return partes.length === 2 ? t('mascotas.edad.y', { a: partes[0], b: partes[1] }) : partes[0];
}

export default function MisMascotasPage() {
  const { t, locale } = useIdioma();
  const [mascotas, setMascotas] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    listarMascotas()
      .then(setMascotas)
      .catch((e) => { setError(e.message); setMascotas([]); });
  }, []);

  async function eliminar(m) {
    if (!window.confirm(t('mascotas.lista.confirmar_eliminar', { nombre: m.nombre }))) return;
    setError('');
    try {
      await eliminarMascota(m.id);
      setMascotas((lista) => lista.filter((x) => x.id !== m.id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app-shell">
      <main className="page">
        <h1 className="masc-titulo">{t('mascotas.lista.titulo')}</h1>
        <p className="masc-sub">{t('mascotas.lista.sub')}</p>

        {error && <p className="masc-error" role="alert">{error}</p>}

        {mascotas === null && <p className="masc-sub">{t('mascotas.cargando')}</p>}

        {mascotas?.length === 0 && !error && (
          <div className="masc-vacio">{t('mascotas.lista.vacio')}</div>
        )}

        <div className="masc-lista">
          {mascotas?.map((m) => (
            <article className="masc-card" key={m.id}>
              {m.foto_url ? (
                <img className="masc-foto" src={urlArchivo(m.foto_url)} alt={t('mascotas.lista.foto_de', { nombre: m.nombre })} />
              ) : (
                <div className="masc-foto masc-foto-vacia" aria-hidden="true">
                  {m.nombre.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="masc-info">
                <h2 className="masc-nombre">
                  {m.nombre}
                  {m.es_fina && <span className="masc-badge">{t('mascotas.lista.fina')}</span>}
                </h2>
                <p className="masc-dato">
                  {t(`mascotas.especie.${m.especie}`)}
                  {m.raza ? ` · ${m.raza}` : ''}
                </p>
                <p className="masc-dato">
                  {[textoEdad(m.edad_meses, t), m.peso_kg != null ? `${Number(m.peso_kg).toLocaleString(locale)} kg` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>

                <div className="masc-acciones">
                  <Link className="masc-link" to={`/mascotas/${m.id}/editar`}>{t('mascotas.lista.editar')}</Link>
                  {!m.es_fina && (
                    <Link className="masc-link" to={`/mascotas/${m.id}/fina`}>{t('mascotas.lista.marcar_fina')}</Link>
                  )}
                  <button type="button" className="masc-link masc-link-peligro" onClick={() => eliminar(m)}>
                    {t('mascotas.lista.eliminar')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Link className="btn-primary" to="/mascotas/nueva">{t('mascotas.lista.registrar')}</Link>
      </main>
    </div>
  );
}
