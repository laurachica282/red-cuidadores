import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { IconCandado, IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconCampana, IconGlobo, IconEstrella, IconLista, IconSalir, IconSiguiente, IconUsuario } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { obtenerPerfil } from '../services/cuentaService.js';
import { RUTAS } from '../rutas.js';

function Opcion({ a, Icono, titulo }) {
  return (
    <li>
      <Link className="cu-opcion" to={a}>
        <span className="cu-opcion-icono"><Icono /></span>
        <span className="cu-opcion-texto">{titulo}</span>
        <IconSiguiente />
      </Link>
    </li>
  );
}

// Mockup 11 (Configuración). "Cambiar contraseña" es la pantalla del módulo auth (HU-05). "Seguridad"
// (HU-07/08), "Métodos de pago" y "Centro de ayuda" se suman a estas listas cuando existan sus pantallas.
export default function CuentaPage() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { datos: perfil, cargando, error } = useCarga(obtenerPerfil);

  const salir = () => {
    cerrarSesion();
    navigate('/login');
  };

  const nombre = perfil?.nombre ?? usuario.nombre;
  const esAdmin = (perfil?.rol ?? usuario.rol) === 'admin';

  return (
    <Pantalla titulo="Configuración" atras="/inicio" etiquetaAtras="Volver al inicio">
      <Link className="cu-perfil" to={RUTAS.datos}>
        <Avatar foto={perfil?.foto} nombre={nombre} tamano={56} />
        <span className="cu-perfil-texto">
          <span className="cu-sr">Datos personales de </span>
          <span className="cu-perfil-nombre">{nombre}</span>
          <span className="cu-perfil-correo">{perfil?.correo ?? usuario.correo}</span>
        </span>
        <IconSiguiente />
      </Link>

      {!cargando && error && <Aviso>{error}</Aviso>}

      <p className="cu-seccion">Cuenta</p>
      <ul className="cu-menu">
        <Opcion a={RUTAS.datos} Icono={IconUsuario} titulo="Datos personales" />
        <Opcion a={RUTAS.cambiarClave} Icono={IconCandado} titulo="Cambiar contraseña" />
        <Opcion a={RUTAS.correo} Icono={IconCorreo} titulo="Cambiar correo electrónico" />
      </ul>

      <p className="cu-seccion">General</p>
      <ul className="cu-menu">
        <Opcion a={RUTAS.notificaciones} Icono={IconCampana} titulo="Notificaciones" />
        <Opcion a={RUTAS.region} Icono={IconGlobo} titulo="Idioma, país y moneda" />
        <Opcion a={RUTAS.resenas} Icono={IconEstrella} titulo="Mis reseñas" />
      </ul>

      {esAdmin && (
        <>
          <p className="cu-seccion">Administración</p>
          <ul className="cu-menu">
            <Opcion a={RUTAS.cuentasDesactivadas} Icono={IconLista} titulo="Cuentas desactivadas" />
          </ul>
        </>
      )}

      <button type="button" className="cu-btn" onClick={salir}><IconSalir /> Cerrar sesión</button>
      <Link className="cu-enlace-peligro" to={RUTAS.desactivar}>Desactivar cuenta</Link>
    </Pantalla>
  );
}
