import '../i18n.js';
import { useIdioma } from '@/modules/region';
import { REGLAS } from './reglasClave.js';
import './ReglasClave.css';

// `extras` suma reglas ya evaluadas: [{ id, texto, ok }] (p. ej. que las dos contraseñas coincidan).
export default function ReglasClave({ clave, extras = [] }) {
  const { t } = useIdioma();
  const reglas = [
    ...REGLAS.map((r) => ({ id: r.id, texto: t(r.texto), ok: r.cumple(clave) })),
    ...extras,
  ];
  return (
    <ul className="reglas-clave" aria-label={t('auth.reglas.titulo')}>
      {reglas.map((r) => {
        const ok = r.ok;
        return (
          <li key={r.id} className={ok ? 'reglas-clave-ok' : ''}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span>
            {r.texto}
            <span className="reglas-clave-estado">{t(ok ? 'auth.reglas.cumplido' : 'auth.reglas.pendiente')}</span>
          </li>
        );
      })}
    </ul>
  );
}
