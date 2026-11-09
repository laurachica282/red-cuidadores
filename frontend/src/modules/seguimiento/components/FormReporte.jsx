import { useEffect, useMemo, useRef, useState } from 'react';
import { crearReporte } from '../services/seguimientoService.js';
import { IconCamara, IconCerrar } from './Iconos.jsx';

const SUGERENCIAS = ['Desayuno', 'Paseo', 'Juego', 'Siesta', 'Comida', 'Antes de dormir'];

// HU-30: el cuidador cuenta cómo va la mascota, con foto opcional.
export default function FormReporte({ reservaId, mascota, onCreado }) {
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
      <h2>Nuevo reporte de {mascota}</h2>
      <div className="sg-sugerencias">
        {SUGERENCIAS.map((s) => (
          <button key={s} type="button" className={`sg-chip${titulo === s ? ' sg-chip--activo' : ''}`} onClick={() => setTitulo(s)}>{s}</button>
        ))}
      </div>
      <input className="input" placeholder="Título, por ejemplo: Paseo en el parque" maxLength={80}
        value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Título del reporte" />
      <textarea className="input sg-textarea" placeholder={`¿Cómo está ${mascota}?`} maxLength={1000} rows={3}
        value={nota} onChange={(e) => setNota(e.target.value)} aria-label="Nota" />

      {vista ? (
        <div className="sg-foto-previa">
          <img src={vista} alt="Foto del reporte" />
          <button type="button" className="sg-redondo sg-redondo--chico" aria-label="Quitar foto" onClick={quitarFoto}><IconCerrar /></button>
        </div>
      ) : (
        <button type="button" className="sg-agregar-foto" onClick={() => entrada.current?.click()}>
          <IconCamara /> Agregar foto
        </button>
      )}
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />

      {error && <p className="sg-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary" disabled={enviando || !titulo.trim()}>
        {enviando ? 'Subiendo…' : 'Publicar reporte'}
      </button>
    </form>
  );
}
