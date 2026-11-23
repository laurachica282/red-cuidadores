import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marcarFina, obtenerMascota } from '../services/mascotasService.js';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import '../mascotas.css';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_MB = 5;

// HU-24: marcar la mascota como fina (valor estimado + comprobante)
export default function MascotaFinaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useIdioma();

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
      setError(t('mascotas.fina.error_tipo'));
      e.target.value = '';
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(t('mascotas.fina.error_peso', { mb: MAX_MB }));
      e.target.value = '';
      return;
    }
    setError('');
    setComprobante(archivo);
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!(Number(valor) > 0)) return setError(t('mascotas.fina.error_valor'));
    if (!comprobante) return setError(t('mascotas.fina.error_comprobante'));

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
        <Link className="masc-volver" to="/mascotas">{t('mascotas.volver')}</Link>
        <h1 className="masc-titulo">{t('mascotas.fina.titulo')}</h1>
        <p className="masc-sub">{mascota ? mascota.nombre : ''}</p>

        {error && !mascota && <p className="masc-error" role="alert">{error}</p>}

        {mascota?.es_fina ? (
          <div className="masc-aviso">{t('mascotas.fina.ya_marcada')}</div>
        ) : (
          mascota && (
            <form className="masc-form" onSubmit={enviar} noValidate>
              <p className="masc-aviso">{t('mascotas.fina.aviso')}</p>

              {error && <p className="masc-error" role="alert">{error}</p>}

              <div className="masc-campo">
                <label className="label" htmlFor="valor">{t('mascotas.fina.valor')}</label>
                <input className="input" id="valor" type="number" min="1" step="1" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>

              <div className="masc-campo">
                <label className="label" htmlFor="comprobante">{t('mascotas.fina.comprobante')}</label>
                <input id="comprobante" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={elegirArchivo} />
                <p className="masc-ayuda">{t('mascotas.fina.comprobante_ayuda', { mb: MAX_MB })}</p>
              </div>

              <button className="btn-primary" type="submit" disabled={guardando}>
                {guardando ? t('mascotas.guardando') : t('mascotas.fina.marcar')}
              </button>
              <Link className="masc-btn-secundario" to="/mascotas">{t('mascotas.cancelar')}</Link>
            </form>
          )
        )}
      </main>
    </div>
  );
}
