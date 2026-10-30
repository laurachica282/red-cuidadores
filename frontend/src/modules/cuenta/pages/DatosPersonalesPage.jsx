import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Aviso from '../components/Aviso.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconCamara } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { actualizarPerfil, obtenerPerfil, quitarFoto, sincronizarSesion, subirFoto } from '../services/cuentaService.js';
import { validarCiudad, validarNombre, validarTelefono } from '../utils/validaciones.js';
import { RUTAS } from '../rutas.js';

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO = 2 * 1024 * 1024;

// HU-09 (mockup 12): foto, nombre, teléfono y ciudad. El correo solo se ve; se cambia en su pantalla (HU-06).
function Formulario({ inicial }) {
  const [perfil, setPerfil] = useState(inicial);
  const [form, setForm] = useState({ nombre: inicial.nombre, telefono: inicial.telefono ?? '', ciudad: inicial.ciudad ?? '' });
  const [tocados, setTocados] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef(null);

  const errores = {
    nombre: validarNombre(form.nombre),
    telefono: validarTelefono(form.telefono),
    ciudad: validarCiudad(form.ciudad),
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const cambio = form.nombre.trim() !== perfil.nombre
    || form.telefono.trim() !== (perfil.telefono ?? '')
    || form.ciudad.trim() !== (perfil.ciudad ?? '');

  const poner = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value });
    setOk('');
  };
  const tocar = (campo) => () => setTocados((t) => ({ ...t, [campo]: true }));
  const mostrarError = (campo) => tocados[campo] && errores[campo];

  const guardar = async (e) => {
    e.preventDefault();
    setTocados({ nombre: true, telefono: true, ciudad: true });
    if (hayErrores) return;
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const nuevo = await actualizarPerfil({ nombre: form.nombre, telefono: form.telefono, ciudad: form.ciudad });
      setPerfil({ ...perfil, ...nuevo });
      setForm({ nombre: nuevo.nombre, telefono: nuevo.telefono ?? '', ciudad: nuevo.ciudad ?? '' });
      sincronizarSesion({ nombre: nuevo.nombre });
      setOk('Tus datos se guardaron');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarFoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError('');
    setOk('');
    if (!TIPOS_FOTO.includes(f.type)) return setError('La foto debe ser JPG, PNG o WEBP');
    if (f.size > MAX_FOTO) return setError('La foto pesa demasiado (máximo 2 MB)');
    setSubiendo(true);
    try {
      setPerfil(await subirFoto(f));
      setOk('Tu foto se actualizó');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const borrarFoto = async () => {
    setError('');
    setOk('');
    setSubiendo(true);
    try {
      setPerfil(await quitarFoto());
      setOk('Quitamos tu foto');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <form className="cu-form" onSubmit={guardar} noValidate>
      <div className="cu-foto">
        <div className="cu-foto-marco">
          <Avatar foto={perfil.foto} nombre={perfil.nombre} tamano={112} />
          <input ref={archivo} id="foto" className="cu-input-archivo" type="file" accept={TIPOS_FOTO.join(',')}
            onChange={cambiarFoto} tabIndex={-1} aria-hidden="true" />
          <button type="button" className="cu-foto-camara" disabled={subiendo} aria-label="Cambiar foto de perfil"
            onClick={() => archivo.current?.click()}>
            <IconCamara />
          </button>
        </div>
        <p className="cu-ayuda" style={{ margin: 0 }}>
          {subiendo ? 'Subiendo foto…' : 'Toca la cámara para cambiar tu foto'}
        </p>
        {perfil.foto && !subiendo && (
          <button type="button" className="cu-btn cu-btn-texto cu-btn-chico" style={{ color: 'var(--danger)' }} onClick={borrarFoto}>
            Quitar foto
          </button>
        )}
      </div>

      <div>
        <label className="label" htmlFor="nombre">Nombre completo</label>
        <input id="nombre" className="input" autoComplete="name" value={form.nombre}
          onChange={poner('nombre')} onBlur={tocar('nombre')} aria-invalid={!!mostrarError('nombre')} aria-describedby="nombre-error" />
        {mostrarError('nombre') && <p id="nombre-error" className="cu-error-campo">{errores.nombre}</p>}
      </div>

      <div>
        <label className="label" htmlFor="telefono">Teléfono</label>
        <input id="telefono" className="input" type="tel" autoComplete="tel" placeholder="+57 300 123 4567" value={form.telefono}
          onChange={poner('telefono')} onBlur={tocar('telefono')} aria-invalid={!!mostrarError('telefono')} aria-describedby="telefono-error" />
        {mostrarError('telefono') && <p id="telefono-error" className="cu-error-campo">{errores.telefono}</p>}
      </div>

      <div>
        <label className="label" htmlFor="ciudad">Ciudad</label>
        <input id="ciudad" className="input" autoComplete="address-level2" placeholder="Bogotá" value={form.ciudad}
          onChange={poner('ciudad')} onBlur={tocar('ciudad')} aria-invalid={!!mostrarError('ciudad')} aria-describedby="ciudad-error" />
        {mostrarError('ciudad') && <p id="ciudad-error" className="cu-error-campo">{errores.ciudad}</p>}
      </div>

      <div>
        <label className="label" htmlFor="correo">Correo electrónico</label>
        <div className="cu-campo">
          <input id="correo" className="input cu-con-enlace" value={perfil.correo} readOnly aria-describedby="correo-ayuda" />
          <Link className="cu-campo-enlace" to={RUTAS.correo}>Cambiar</Link>
        </div>
        <p id="correo-ayuda" className="cu-ayuda">El correo se cambia con verificación por código.</p>
      </div>

      <div className="cu-acciones">
        <Aviso>{error}</Aviso>
        <Aviso tipo="ok">{ok}</Aviso>
        <button type="submit" className="btn-primary" disabled={!cambio || guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export default function DatosPersonalesPage() {
  const { datos, cargando, error } = useCarga(obtenerPerfil);
  return (
    <Pantalla titulo="Datos personales">
      {cargando && <p className="cu-cargando">Cargando…</p>}
      {!cargando && error && <Aviso>{error}</Aviso>}
      {datos && <Formulario inicial={datos} />}
    </Pantalla>
  );
}
