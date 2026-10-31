import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marcarFina, obtenerMascota } from '../services/mascotasService.js';
import '../mascotas.css';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_MB = 5;

// HU-24: marcar la mascota como fina (valor estimado + comprobante)
export default function MascotaFinaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mascota, setMascota] = useState(null);
  const [valor, setValor] = useState('');
  const [comprobante, setComprobante] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerMascota(id).then(setMascota).catch((e) => setError(e.message));
  }, [id]);

  function elegirArchivo(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) {
      setError('El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF');
      e.target.value = '';
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`El comprobante no puede pesar más de ${MAX_MB} MB`);
      e.target.value = '';
      return;
    }
    setError('');
    setComprobante(archivo);
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!(Number(valor) > 0)) return setError('Escribe el valor estimado de tu mascota');
    if (!comprobante) return setError('Adjunta el comprobante (pedigrí, factura o certificado)');

    const datos = new FormData();
    datos.append('valor_estimado', valor);
    datos.append('comprobante', comprobante);

    setGuardando(true);
    try {
      await marcarFina(id, datos);
      navigate('/mascotas');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="page">
        <Link className="masc-volver" to="/mascotas">← Mis mascotas</Link>
        <h1 className="masc-titulo">Mascota fina</h1>
        <p className="masc-sub">{mascota ? mascota.nombre : ''}</p>

        {error && !mascota && <p className="masc-error" role="alert">{error}</p>}

        {mascota?.es_fina ? (
          <div className="masc-aviso">Esta mascota ya está marcada como fina.</div>
        ) : (
          mascota && (
            <form className="masc-form" onSubmit={enviar} noValidate>
              <p className="masc-aviso">
                Las mascotas finas (raza de alto valor o con pedigrí) exigen cuidador verificado
                con verificación en dos pasos, Garantía Plus y entrega con código.
              </p>

              {error && <p className="masc-error" role="alert">{error}</p>}

              <div className="masc-campo">
                <label className="label" htmlFor="valor">Valor estimado *</label>
                <input className="input" id="valor" type="number" min="1" step="1" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>

              <div className="masc-campo">
                <label className="label" htmlFor="comprobante">Comprobante *</label>
                <input id="comprobante" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={elegirArchivo} />
                <p className="masc-ayuda">Pedigrí, factura o certificado. Imagen o PDF, máximo {MAX_MB} MB.</p>
              </div>

              <button className="btn-primary" type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Marcar como fina'}
              </button>
              <Link className="masc-btn-secundario" to="/mascotas">Cancelar</Link>
            </form>
          )
        )}
      </main>
    </div>
  );
}
