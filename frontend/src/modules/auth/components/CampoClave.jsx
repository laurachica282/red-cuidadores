import { IconCandado, IconOjo, IconOjoCerrado } from '@/shared/components/Icons.jsx';

export default function CampoClave({ id, etiqueta, placeholder, valor, onChange, ver, onVer, autoComplete = 'new-password' }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{etiqueta}</label>
      <div className="campo">
        <span className="campo-icono"><IconCandado /></span>
        <input id={id} className="input con-ojo" type={ver ? 'text' : 'password'} autoComplete={autoComplete}
          placeholder={placeholder} value={valor} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" className="campo-ojo" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={onVer}>
          {ver ? <IconOjoCerrado /> : <IconOjo />}
        </button>
      </div>
    </div>
  );
}
