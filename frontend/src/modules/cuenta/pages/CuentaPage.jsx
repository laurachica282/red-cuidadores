import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconCampana, IconGlobo, IconEstrella, IconLista, IconSalir, IconSiguiente, IconUsuario } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { obtenerPerfil } from '../services/cuentaService.js';

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

// Mockup 11 (Configuración). "Cambiar contraseña", "Seguridad", "Métodos de pago" y "Centro de ayuda"
// son de otros módulos: se suman a estas listas cuando existan sus pantallas.
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
      <Link className="cu-perfil" to="/cuenta/datos" aria-label={`Datos personales de ${nombre}`}>
        <Avatar foto={perfil?.foto} nombre={nombre} tamano={56} />
        <span className="cu-perfil-texto">
          <p className="cu-perfil-nombre">{nombre}</p>
          <p className="cu-perfil-correo">{perfil?.correo ?? usuario.correo}</p>
        </span>
        <IconSiguiente />
      </Link>

      {!cargando && error && <Aviso>{error}</Aviso>}

      <p className="cu-seccion">Cuenta</p>
      <ul className="cu-menu">
        <Opcion a="/cuenta/datos" Icono={IconUsuario} titulo="Datos personales" />
        <Opcion a="/cuenta/correo" Icono={IconCorreo} titulo="Cambiar correo electrónico" />
      </ul>

      <p className="cu-seccion">General</p>
      <ul className="cu-menu">
        <Opcion a="/cuenta/notificaciones" Icono={IconCampana} titulo="Notificaciones" />
        <Opcion a="/cuenta/region" Icono={IconGlobo} titulo="Idioma, país y moneda" />
        <Opcion a="/cuenta/resenas" Icono={IconEstrella} titulo="Mis reseñas" />
      </ul>

      {esAdmin && (
        <>
          <p className="cu-seccion">Administración</p>
          <ul className="cu-menu">
            <Opcion a="/cuenta/admin/desactivadas" Icono={IconLista} titulo="Cuentas desactivadas" />
          </ul>
        </>
      )}

      <button type="button" className="cu-btn" onClick={salir}><IconSalir /> Cerrar sesión</button>
      <Link className="cu-enlace-peligro" to="/cuenta/desactivar">Desactivar cuenta</Link>
    </Pantalla>
  );
}
