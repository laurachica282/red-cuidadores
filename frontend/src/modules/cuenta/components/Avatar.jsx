import { useIdioma } from '@/modules/region';
import '../i18n.js';
import { urlFoto } from '../services/cuentaService.js';

const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default function Avatar({ foto, nombre, tamano = 72 }) {
  const { t } = useIdioma();
  const src = urlFoto(foto);
  return (
    <span className="cu-avatar" style={{ width: tamano, height: tamano, fontSize: tamano * 0.36 }}>
      {src ? <img src={src} alt={t('cuenta.avatar.alt', { nombre })} /> : <span aria-hidden="true">{iniciales(nombre)}</span>}
    </span>
  );
}
