import { Link } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { useIdioma } from '@/modules/region';
import Pantalla from './Pantalla.jsx';

// Deja ver la pantalla solo al rol indicado ('cuidador' o 'admin'). El servidor también lo exige.
export default function SoloRol({ rol, children }) {
  const { usuario } = useAuth();
  const { t } = useIdioma();
  if (usuario?.rol === rol) return children;
  return (
    <Pantalla titulo={t(rol === 'admin' ? 'comun.solo_admin' : 'comun.solo_cuidadores')} atras="/inicio">
      <Link className="btn-primary cd-espacio" to="/inicio">{t('comun.ir_inicio')}</Link>
    </Pantalla>
  );
}
