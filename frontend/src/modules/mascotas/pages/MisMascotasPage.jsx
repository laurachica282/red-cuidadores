import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarMascotas, eliminarMascota, urlArchivo } from '../services/mascotasService.js';
import '../mascotas.css';

function textoEdad(meses) {
  if (meses == null) return null;
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  const partes = [];
  if (a) partes.push(`${a} ${a === 1 ? 'año' : 'años'}`);
  if (m || !a) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
  return partes.join(' y ');
}

export default function MisMascotasPage() {
  const [mascotas, setMascotas] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    listarMascotas()
      .then(setMascotas)
      .catch((e) => { setError(e.message); setMascotas([]); });
  }, []);

  async function eliminar(m) {
    if (!window.confirm(`¿Eliminar a ${m.nombre}?`)) return;
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
        <h1 className="masc-titulo">Mis mascotas</h1>
        <p className="masc-sub">Registra la ficha de cada mascota para poder reservar.</p>

        {error && <p className="masc-error" role="alert">{error}</p>}

        {mascotas === null && <p className="masc-sub">Cargando…</p>}

        {mascotas?.length === 0 && !error && (
          <div className="masc-vacio">Aún no has registrado mascotas.</div>
        )}

        <div className="masc-lista">
          {mascotas?.map((m) => (
            <article className="masc-card" key={m.id}>
              {m.foto_url ? (
                <img className="masc-foto" src={urlArchivo(m.foto_url)} alt={`Foto de ${m.nombre}`} />
              ) : (
                <div className="masc-foto masc-foto-vacia" aria-hidden="true">
                  {m.nombre.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="masc-info">
                <h2 className="masc-nombre">
                  {m.nombre}
                  {m.es_fina && <span className="masc-badge">Fina</span>}
                </h2>
                <p className="masc-dato">
                  {m.especie.charAt(0).toUpperCase() + m.especie.slice(1)}
                  {m.raza ? ` · ${m.raza}` : ''}
                </p>
                <p className="masc-dato">
                  {[textoEdad(m.edad_meses), m.peso_kg != null ? `${Number(m.peso_kg)} kg` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>

                <div className="masc-acciones">
                  <Link className="masc-link" to={`/mascotas/${m.id}/editar`}>Editar</Link>
                  {!m.es_fina && (
                    <Link className="masc-link" to={`/mascotas/${m.id}/fina`}>Marcar como fina</Link>
                  )}
                  <button type="button" className="masc-link masc-link-peligro" onClick={() => eliminar(m)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Link className="btn-primary" to="/mascotas/nueva">Registrar mascota</Link>
      </main>
    </div>
  );
}
