import { useEffect, useMemo, useRef, useState } from 'react';
import { useIdioma } from '@/modules/region';
import { crearReporte } from '../services/seguimientoService.js';
import { IconCamara, IconCerrar } from './Iconos.jsx';
import '../i18n.js';

// Títulos sugeridos; se escriben en el idioma de quien publica el reporte.
const SUGERENCIAS = ['desayuno', 'paseo', 'juego', 'siesta', 'comida', 'dormir'];

// HU-30: el cuidador cuenta cómo va la mascota, con foto opcional.
export default function FormReporte({ reservaId, mascota, onCreado }) {
  const { t } = useIdioma();
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const entrada = useRef(null);

  // Vista previa de la foto elegida; se libera la memoria al cambiarla.
  const vista = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const quitarFoto = () => {
    setFoto(null);
    if (entrada.current) entrada.current.value = '';
  };

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const reporte = await crearReporte(reservaId, { titulo: titulo.trim(), nota: nota.trim(), foto });
      setTitulo('');
      setNota('');
      quitarFoto();
      onCreado(reporte);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="sg-tarjeta sg-form-reporte" onSubmit={enviar}>
      <h2>{t('seguimiento.reporte.titulo', { mascota })}</h2>
      <div className="sg-sugerencias">
        {SUGERENCIAS.map((clave) => {
          const s = t(`seguimiento.reporte.sug.${clave}`);
          return (
            <button key={clave} type="button" className={`sg-chip${titulo === s ? ' sg-chip--activo' : ''}`} onClick={() => setTitulo(s)}>{s}</button>
          );
        })}
      </div>
      <input className="input" placeholder={t('seguimiento.reporte.titulo_ejemplo')} maxLength={80}
        value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label={t('seguimiento.reporte.titulo_aria')} />
      <textarea className="input sg-textarea" placeholder={t('seguimiento.reporte.nota_ejemplo', { mascota })} maxLength={1000} rows={3}
        value={nota} onChange={(e) => setNota(e.target.value)} aria-label={t('seguimiento.reporte.nota_aria')} />

      {vista ? (
        <div className="sg-foto-previa">
          <img src={vista} alt={t('seguimiento.reporte.foto_alt')} />
          <button type="button" className="sg-redondo sg-redondo--chico" aria-label={t('seguimiento.reporte.quitar_foto')} onClick={quitarFoto}><IconCerrar /></button>
        </div>
      ) : (
        <button type="button" className="sg-agregar-foto" onClick={() => entrada.current?.click()}>
          <IconCamara /> {t('seguimiento.reporte.agregar_foto')}
        </button>
      )}
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />

      {error && <p className="sg-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary" disabled={enviando || !titulo.trim()}>
        {enviando ? t('seguimiento.reporte.subiendo') : t('seguimiento.reporte.publicar')}
      </button>
    </form>
  );
}
