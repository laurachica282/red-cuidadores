import { useIdioma } from '@/modules/region';
import { IconAlerta, IconEscudo, IconReloj } from './Iconos.jsx';
import InsigniaAntecedentes from './InsigniaAntecedentes.jsx';

export function ChipEstado({ estado }) {
  const { t } = useIdioma();
  return <span className={`cd-chip cd-chip-${estado}`}>{t(`estado.${estado}`)}</span>;
}

const ESTILO = {
  en_revision: ['cd-caja-alerta', <IconReloj key="i" />],
  aprobado: ['cd-caja-ok', <IconEscudo key="i" width="20" height="20" />],
  rechazado: ['cd-caja-error', <IconAlerta key="i" />],
  vencido: ['cd-caja-neutra', <IconReloj key="i" />],
};

// Caja de estado de la verificación (como "Tu cuenta está protegida" en los mockups).
export default function EstadoVerificacion({ verificacion }) {
  const { t } = useIdioma();
  const { estado, motivoRechazo, venceEn } = verificacion;
  if (estado === 'sin_enviar') return null;
  const [clase, icono] = ESTILO[estado];

  return (
    <div className={`cd-caja ${clase}`} role="status">
      {icono}
      <div className="cd-caja-texto">
        <strong>{t(`estado.${estado}`)}</strong>
        <p>{t(`verif.estado_${estado}`)}</p>
        {estado === 'rechazado' && motivoRechazo && (
          <p className="cd-motivo"><strong>{t('verif.motivo')}:</strong> {motivoRechazo}</p>
        )}
        {estado === 'aprobado' && <InsigniaAntecedentes venceEn={venceEn} />}
      </div>
    </div>
  );
}
