import { useEffect, useState } from 'react';
import { useIdioma } from '@/modules/region';
import { IconAtras, IconCheck } from '../components/Iconos.jsx';
import { guardarContacto, guardarVeterinario, leerContacto, urlArchivo, veterinarios } from '../services/seguimientoService.js';
import { iniciales } from '../utils.js';
import { useVolver } from '../useVolver.js';
import '../i18n.js';
import '../seguimiento.css';

const VACIO_CONTACTO = { nombre: '', parentesco: '', telefono: '', correo: '' };
const VACIO_VET = { nombre: '', clinica: '', telefono: '', direccion: '' };

function Campo({ etiqueta, ...props }) {
  return (
    <label className="sg-campo">
      <span className="label">{etiqueta}</span>
      <input className="input" {...props} />
    </label>
  );
}

// Formulario del veterinario de una mascota.
function FormVeterinario({ mascota }) {
  const { t } = useIdioma();
  const [v, setV] = useState({ ...VACIO_VET, ...(mascota.veterinario ?? {}) });
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const cambiar = (campo) => (e) => { setV((a) => ({ ...a, [campo]: e.target.value })); setEstado(''); };

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try {
      await guardarVeterinario(mascota.id, v);
      setEstado('guardado');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="sg-tarjeta sg-form" onSubmit={guardar}>
      <div className="sg-mascota">
        <span className="sg-avatar sg-avatar--chico">
          {mascota.foto ? <img src={urlArchivo(mascota.foto)} alt="" /> : iniciales(mascota.nombre)}
        </span>
        <strong>{mascota.nombre}</strong>
      </div>
      <Campo etiqueta={t('seguimiento.contactos.veterinario')} placeholder={t('seguimiento.contactos.veterinario_ejemplo')}
        value={v.nombre} onChange={cambiar('nombre')} maxLength={120} />
      <div className="sg-dos">
        <Campo etiqueta={t('seguimiento.contactos.telefono')} type="tel" placeholder="601 555 7788" value={v.telefono} onChange={cambiar('telefono')} />
        <Campo etiqueta={t('seguimiento.contactos.clinica')} value={v.clinica ?? ''} onChange={cambiar('clinica')} maxLength={120} />
      </div>
      <Campo etiqueta={t('seguimiento.contactos.direccion')} value={v.direccion ?? ''} onChange={cambiar('direccion')} maxLength={200} />
      {error && <p className="sg-error" role="alert">{error}</p>}
      <button type="submit" className="sg-boton-borde">
        {estado === 'guardado'
          ? <><IconCheck width="18" height="18" /> {t('seguimiento.contactos.vet_guardado')}</>
          : t('seguimiento.contactos.guardar_vet')}
      </button>
    </form>
  );
}

// HU-28: el viajero registra a quién avisar y el veterinario de cada mascota.
export default function EmergenciaPage() {
  const { t } = useIdioma();
  const volver = useVolver('/reservas');
  const [contacto, setContacto] = useState(VACIO_CONTACTO);
  const [mascotas, setMascotas] = useState(null);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    leerContacto().then((c) => c && setContacto({ ...VACIO_CONTACTO, ...c, parentesco: c.parentesco ?? '', correo: c.correo ?? '' })).catch(() => {});
    veterinarios().then(setMascotas).catch((e) => setError(e.message));
  }, []);

  const cambiar = (campo) => (e) => { setContacto((a) => ({ ...a, [campo]: e.target.value })); setEstado(''); };

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try {
      await guardarContacto(contacto);
      setEstado('guardado');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="sg-pagina">
      <div className="sg-encabezado">
        <button type="button" className="sg-redondo" aria-label={t('seguimiento.volver')} onClick={volver}><IconAtras /></button>
        <h1>{t('seguimiento.contactos.titulo')}</h1>
      </div>
      <p className="sg-sub">{t('seguimiento.contactos.sub')}</p>

      <h2 className="sg-titulo-seccion">{t('seguimiento.contactos.contacto')}</h2>
      <form className="sg-tarjeta sg-form" onSubmit={guardar}>
        <div className="sg-dos">
          <Campo etiqueta={t('seguimiento.contactos.nombre')} placeholder="Marta Gómez" value={contacto.nombre} onChange={cambiar('nombre')} maxLength={120} />
          <Campo etiqueta={t('seguimiento.contactos.parentesco')} placeholder={t('seguimiento.contactos.parentesco_ejemplo')}
            value={contacto.parentesco} onChange={cambiar('parentesco')} maxLength={40} />
        </div>
        <div className="sg-dos">
          <Campo etiqueta={t('seguimiento.contactos.telefono')} type="tel" placeholder="+57 310 555 1234" value={contacto.telefono} onChange={cambiar('telefono')} />
          <Campo etiqueta={t('seguimiento.contactos.correo')} type="email" placeholder={t('seguimiento.contactos.correo_ejemplo')}
            value={contacto.correo} onChange={cambiar('correo')} />
        </div>
        {error && <p className="sg-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary">
          {estado === 'guardado' ? t('seguimiento.contactos.guardado') : t('seguimiento.contactos.guardar')}
        </button>
      </form>

      <h2 className="sg-titulo-seccion">{t('seguimiento.contactos.veterinarios')}</h2>
      {mascotas?.length === 0 && <p className="sg-vacio">{t('seguimiento.contactos.sin_mascotas')}</p>}
      {mascotas?.map((m) => <FormVeterinario key={m.id} mascota={m} />)}
    </main>
  );
}
