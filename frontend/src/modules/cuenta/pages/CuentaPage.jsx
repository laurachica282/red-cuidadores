import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import '../i18n.js';
import { IconCandado, IconCorreo } from '@/shared/components/Icons.jsx';
import Aviso from '../components/Aviso.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconCampana, IconGlobo, IconEstrella, IconLista, IconSalir, IconSiguiente, IconUsuario } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { useCarga } from '../hooks/useCarga.js';
import { obtenerPerfil } from '../services/cuentaService.js';
import { ETIQUETA_ROL } from '../utils/textos.js';
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
  const { t } = useIdioma();
  const navigate = useNavigate();
  const { datos: perfil, cargando, error } = useCarga(obtenerPerfil);

  const salir = () => {
    cerrarSesion();
    navigate('/login');
  };

  const nombre = perfil?.nombre ?? usuario.nombre;
  const rol = perfil?.rol ?? usuario.rol;
  const esAdmin = rol === 'admin';

  return (
    <Pantalla titulo={t('cuenta.menu.titulo')} atras={null}>
      {/* Solo información: los datos se editan en "Datos personales" (un único camino). */}
      <section className="cu-perfil" aria-label={t('cuenta.menu.tuCuenta')}>
        <Avatar foto={perfil?.foto} nombre={nombre} tamano={56} />
        <span className="cu-perfil-texto">
          <span className="cu-perfil-nombre">{nombre}</span>
          <span className="cu-perfil-correo">{perfil?.correo ?? usuario.correo}</span>
          <span className="cu-perfil-rol">{ETIQUETA_ROL[rol] ? t(ETIQUETA_ROL[rol]) : ''}</span>
        </span>
      </section>

      {!cargando && error && <Aviso>{error}</Aviso>}

      <p className="cu-seccion">{t('cuenta.menu.seccionCuenta')}</p>
      <ul className="cu-menu">
        <Opcion a={RUTAS.datos} Icono={IconUsuario} titulo={t('cuenta.menu.datos')} />
        <Opcion a={RUTAS.cambiarClave} Icono={IconCandado} titulo={t('cuenta.menu.cambiarClave')} />
        <Opcion a={RUTAS.correo} Icono={IconCorreo} titulo={t('cuenta.menu.cambiarCorreo')} />
      </ul>

      <p className="cu-seccion">{t('cuenta.menu.seccionGeneral')}</p>
      <ul className="cu-menu">
        <Opcion a={RUTAS.notificaciones} Icono={IconCampana} titulo={t('cuenta.menu.notificaciones')} />
        <Opcion a={RUTAS.region} Icono={IconGlobo} titulo={t('cuenta.menu.region')} />
        <Opcion a={RUTAS.resenas} Icono={IconEstrella} titulo={t('cuenta.menu.resenas')} />
      </ul>

      {esAdmin && (
        <>
          <p className="cu-seccion">{t('cuenta.menu.seccionAdmin')}</p>
          <ul className="cu-menu">
            <Opcion a={RUTAS.cuentasDesactivadas} Icono={IconLista} titulo={t('cuenta.menu.cuentasDesactivadas')} />
          </ul>
        </>
      )}

      <button type="button" className="cu-btn" onClick={salir}><IconSalir /> {t('cuenta.menu.cerrarSesion')}</button>
      <Link className="cu-enlace-peligro" to={RUTAS.desactivar}>{t('cuenta.menu.desactivar')}</Link>
    </Pantalla>
  );
}
