import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { guardarMascota, obtenerMascota, urlArchivo } from '../services/mascotasService.js';
import '../mascotas.css';

const ESPECIES = [
  ['perro', 'Perro'], ['gato', 'Gato'], ['ave', 'Ave'], ['conejo', 'Conejo'],
  ['roedor', 'Roedor'], ['reptil', 'Reptil'], ['otro', 'Otro'],
];
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

const VACIO = {
  nombre: '', especie: 'perro', raza: '', anios: '', meses: '',
  peso_kg: '', vacunas: '', microchip: '', indicaciones_medicas: '',
};

// HU-23: registrar (sin id en la ruta) o editar (con id) la ficha de la mascota
export default function FichaMascotaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(VACIO);
  const [foto, setFoto] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [fotoActual, setFotoActual] = useState(null);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    obtenerMascota(id)
      .then((m) => {
        setForm({
          nombre: m.nombre,
          especie: m.especie,
          raza: m.raza ?? '',
          anios: m.edad_meses != null ? String(Math.floor(m.edad_meses / 12)) : '',
          meses: m.edad_meses != null ? String(m.edad_meses % 12) : '',
          peso_kg: m.peso_kg != null ? String(Number(m.peso_kg)) : '',
          vacunas: m.vacunas ?? '',
          microchip: m.microchip ?? '',
          indicaciones_medicas: m.indicaciones_medicas ?? '',
        });
        setFotoActual(m.foto_url);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  // Libera la vista previa al cambiar de foto o salir de la pantalla
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function elegirFoto(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) {
      setError('La foto debe ser JPG, PNG o WEBP');
      e.target.value = '';
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La foto no puede pesar más de ${MAX_MB} MB`);
      e.target.value = '';
      return;
    }
    setError('');
    setFoto(archivo);
    setPrevia(URL.createObjectURL(archivo));
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!form.nombre.trim()) return setError('El nombre es obligatorio');

    const datos = new FormData();
    datos.append('nombre', form.nombre);
    datos.append('especie', form.especie);
    datos.append('raza', form.raza);
    const hayEdad = form.anios !== '' || form.meses !== '';
    const totalMeses = (Number(form.anios) || 0) * 12 + (Number(form.meses) || 0);
    datos.append('edad_meses', hayEdad ? String(totalMeses) : '');
    datos.append('peso_kg', form.peso_kg);
    datos.append('vacunas', form.vacunas);
    datos.append('microchip', form.microchip);
    datos.append('indicaciones_medicas', form.indicaciones_medicas);
    if (foto) datos.append('foto', foto);

    setGuardando(true);
    try {
      await guardarMascota(id, datos);
      navigate('/mascotas');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const imagen = previa ?? urlArchivo(fotoActual);

  return (
    <div className="app-shell">
      <main className="page">
        <Link className="masc-volver" to="/mascotas">← Mis mascotas</Link>
        <h1 className="masc-titulo">{id ? 'Editar mascota' : 'Registrar mascota'}</h1>
        <p className="masc-sub">Los campos con * son obligatorios.</p>

        {cargando ? (
          <p className="masc-sub">Cargando…</p>
        ) : (
          <form className="masc-form" onSubmit={enviar} noValidate>
            {error && <p className="masc-error" role="alert">{error}</p>}

            <div className="masc-campo">
              <label className="label" htmlFor="nombre">Nombre *</label>
              <input className="input" id="nombre" name="nombre" value={form.nombre} onChange={cambiar} maxLength={80} />
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="especie">Especie *</label>
              <select className="input" id="especie" name="especie" value={form.especie} onChange={cambiar}>
                {ESPECIES.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="raza">Raza</label>
              <input className="input" id="raza" name="raza" value={form.raza} onChange={cambiar} maxLength={80} />
            </div>

            <div className="masc-campo">
              <span className="label">Edad</span>
              <div className="masc-fila">
                <input className="input" name="anios" type="number" min="0" max="50" placeholder="Años" aria-label="Años" value={form.anios} onChange={cambiar} />
                <input className="input" name="meses" type="number" min="0" max="11" placeholder="Meses" aria-label="Meses" value={form.meses} onChange={cambiar} />
              </div>
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="peso_kg">Peso (kg)</label>
              <input className="input" id="peso_kg" name="peso_kg" type="number" min="0" step="0.1" value={form.peso_kg} onChange={cambiar} />
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="vacunas">Vacunas</label>
              <textarea className="input masc-textarea" id="vacunas" name="vacunas" value={form.vacunas} onChange={cambiar} placeholder="Ej.: Rabia, parvovirus" />
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="microchip">Microchip</label>
              <input className="input" id="microchip" name="microchip" value={form.microchip} onChange={cambiar} maxLength={40} />
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="indicaciones_medicas">Indicaciones médicas</label>
              <textarea className="input masc-textarea" id="indicaciones_medicas" name="indicaciones_medicas" value={form.indicaciones_medicas} onChange={cambiar} placeholder="Alergias, medicamentos, cuidados especiales" />
            </div>

            <div className="masc-campo">
              <label className="label" htmlFor="foto">Foto</label>
              {imagen && <img className="masc-previa" src={imagen} alt="Vista previa de la foto" />}
              <input id="foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={elegirFoto} />
              <p className="masc-ayuda">JPG, PNG o WEBP, máximo {MAX_MB} MB.</p>
            </div>

            <button className="btn-primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <Link className="masc-btn-secundario" to="/mascotas">Cancelar</Link>
          </form>
        )}
      </main>
    </div>
  );
}
