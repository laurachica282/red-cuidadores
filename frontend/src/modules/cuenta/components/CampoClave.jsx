import { useState } from 'react';
import { IconCandado, IconOjo, IconOjoCerrado } from '@/shared/components/Icons.jsx';

export default function CampoClave({ id, etiqueta, valor, onChange, autoComplete = 'current-password', ayuda }) {
  const [ver, setVer] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{etiqueta}</label>
      <div className="cu-campo">
        <span className="cu-campo-icono"><IconCandado /></span>
        <input id={id} className="input cu-con-icono cu-con-ojo" type={ver ? 'text' : 'password'}
          autoComplete={autoComplete} value={valor} onChange={(e) => onChange(e.target.value)}
          aria-describedby={ayuda ? `${id}-ayuda` : undefined} required />
        <button type="button" className="cu-campo-ojo" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVer(!ver)}>
          {ver ? <IconOjoCerrado /> : <IconOjo />}
        </button>
      </div>
      {ayuda && <p id={`${id}-ayuda`} className="cu-ayuda">{ayuda}</p>}
    </div>
  );
}
