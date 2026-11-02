import { useIdioma } from '@/modules/region';
import { IconEscudo } from './Iconos.jsx';
import '../cuidadores.css';

// HU-13: insignia "Antecedentes verificados" (misma forma que "Verificado" en los mockups).
// La pueden usar otros módulos: perfil del cuidador, tarjetas de búsqueda, etc.
export default function InsigniaAntecedentes({ venceEn }) {
  const { t, fecha } = useIdioma();
  return (
    <span className="cd-insignia">
      <IconEscudo width="16" height="16" />
      <span>
        {t('insignia')}
        {venceEn && <small>{t('insignia.vence', { fecha: fecha(venceEn) })}</small>}
      </span>
    </span>
  );
}
