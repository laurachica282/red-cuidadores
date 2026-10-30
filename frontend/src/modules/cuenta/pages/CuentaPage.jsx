import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import Avatar from '../components/Avatar.jsx';
import {
  IconApagar, IconCampana, IconEscudo, IconGlobo, IconEstrella, IconLista, IconSalir, IconSiguiente, IconUsuario,
} from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { obtenerPerfil } from '../services/cuentaService.js';
import { ETIQUETA_ROL } from '../utils/textos.js';

const OPCIONES = [
  { a: '/cuenta/datos', Icono: IconUsuario, titulo: 'Datos personales', desc: 'Nombre, teléfono, ciudad y foto' },
  { a: '/cuenta/correo', Icono: IconCorreo, titulo: 'Correo electrónico', desc: 'Cambiarlo con verificación' },
  { a: '/cuenta/notificaciones', Icono: IconCampana, titulo: 'Notificaciones', desc: 'Qué avisos recibes y por dónde' },
  { a: '/cuenta/region', Icono: IconGlobo, titulo: 'País y moneda', desc: 'Cómo ves los precios' },
  { a: '/cuenta/resenas', Icono: IconEstrella, titulo: 'Mis reseñas', desc: 'Lo que has calificado' },
];

function Opcion({ a, Icono, titulo, desc, peligro }) {
  return (
    <li>
      <Link className={`cu-opcion ${peligro ? 'cu-opcion-peligro' : ''}`} to={a}>
        <span className="cu-opcion-icono"><Icono /></span>
        <span className="cu-opcion-texto">{titulo}<small>{desc}</small></span>
        <IconSiguiente />
      </Link>
    </li>
  );
}

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
    <Pantalla titulo="Mi cuenta" atras="/inicio" etiquetaAtras="Volver al inicio">
      <div className="cu-perfil">
        <Avatar foto={perfil?.foto} nombre={nombre} />
        <div>
          <p className="cu-perfil-nombre">{nombre}</p>
          <p className="cu-perfil-correo">{perfil?.correo ?? usuario.correo}</p>
          <span className="cu-etiqueta">{ETIQUETA_ROL[perfil?.rol ?? usuario.rol]}</span>
        </div>
      </div>

      {!cargando && error && <Aviso>{error}</Aviso>}

      <p className="cu-seccion">Configuración</p>
      <ul className="cu-menu">
        {OPCIONES.map((o) => <Opcion key={o.a} {...o} />)}
      </ul>

      {esAdmin && (
        <>
          <p className="cu-seccion">Administración</p>
          <ul className="cu-menu">
            <Opcion a="/cuenta/admin/desactivadas" Icono={IconLista} titulo="Cuentas desactivadas" desc="Historial sin datos personales" />
          </ul>
        </>
      )}

      <p className="cu-seccion">Seguridad</p>
      <ul className="cu-menu">
        <Opcion a="/cuenta/desactivar" Icono={IconApagar} titulo="Desactivar cuenta" desc="Se conservan tus datos" peligro />
      </ul>

      <button type="button" className="cu-btn" onClick={salir}><IconSalir /> Cerrar sesión</button>
      <p className="cu-texto" style={{ textAlign: 'center' }}><IconEscudo style={{ verticalAlign: '-4px' }} /> Tus datos están protegidos</p>
    </Pantalla>
  );
}
