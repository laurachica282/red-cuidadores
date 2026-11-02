import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import { ChipEstado } from '../components/EstadoVerificacion.jsx';
import InsigniaAntecedentes from '../components/InsigniaAntecedentes.jsx';
import { IconChevron, IconDocumento, IconEscudo, IconMundo, IconPerfil, IconPin, IconCasa } from '../components/Iconos.jsx';
import Pantalla from '../components/Pantalla.jsx';
import { obtenerMiPerfil } from '../services/cuidadoresService.js';

const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('');

function Fila({ a, icono, texto, chip }) {
  return (
    <Link to={a} className="cd-fila">
      <span className="cd-fila-icono">{icono}</span>
      <span className="cd-fila-texto">{texto}</span>
      {chip}
      <IconChevron />
    </Link>
  );
}

// Panel del cuidador: mismo formato que la pantalla "Configuración" de los mockups.
export default function PanelCuidadorPage() {
  const { usuario } = useAuth();
  const { t } = useIdioma();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    obtenerMiPerfil().then((d) => vivo && setDatos(d)).catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, []);

  return (
    <Pantalla titulo={t('panel.titulo')} atras="/inicio">
      <Link to="/cuidador/perfil" className="cd-yo">
        <span className="cd-yo-avatar">{iniciales(usuario.nombre)}</span>
        <span className="cd-yo-texto">
          <strong>{usuario.nombre}</strong>
          <small>{usuario.correo}</small>
        </span>
        <IconChevron />
      </Link>

      {error && <p className="cd-error" role="alert">{error}</p>}
      {!datos && !error && <p className="cd-sub">{t('comun.cargando')}</p>}

      {datos && (
        <div className={`cd-caja ${datos.visibleEnBusqueda ? 'cd-caja-ok' : 'cd-caja-alerta'}`} role="status">
          <IconEscudo width="20" height="20" />
          <div className="cd-caja-texto">
            <p>{datos.visibleEnBusqueda ? t('panel.visible') : t('panel.no_visible')}</p>
            {datos.verificacion.estado === 'aprobado' && <InsigniaAntecedentes venceEn={datos.verificacion.venceEn} />}
          </div>
        </div>
      )}

      <h2 className="cd-seccion">{t('panel.seccion_perfil')}</h2>
      <nav className="cd-lista" aria-label={t('panel.seccion_perfil')}>
        <Fila a="/cuidador/perfil" icono={<IconPerfil />} texto={t('panel.perfil')} />
        <Fila a="/cuidador/verificacion" icono={<IconEscudo width="22" height="22" />} texto={t('panel.verif')}
          chip={datos && <ChipEstado estado={datos.verificacion.estado} />} />
        <Fila a="/cuidador/vista-previa" icono={<IconCasa width="22" height="22" strokeWidth="1.8" />} texto={t('panel.vista_previa')} />
      </nav>

      <h2 className="cd-seccion">{t('panel.seccion_general')}</h2>
      <nav className="cd-lista" aria-label={t('panel.seccion_general')}>
        <Fila a="/configuracion/region" icono={<IconMundo />} texto={t('panel.region')} />
        <Fila a="/region/cuidadores" icono={<IconPin />} texto={t('panel.cuidadores_region')} />
        <Fila a="/terminos" icono={<IconDocumento />} texto={t('panel.terminos')} />
      </nav>
    </Pantalla>
  );
}
