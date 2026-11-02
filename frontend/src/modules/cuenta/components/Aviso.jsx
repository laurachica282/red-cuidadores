import { IconAlerta, IconCheck } from './Iconos.jsx';

// Mensaje dentro de la pantalla. Los errores se anuncian (role="alert") y los éxitos se leen
// sin interrumpir (role="status"), para que un lector de pantalla los avise.
export default function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  return (
    <p className={`cu-aviso cu-aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {tipo === 'ok' ? <IconCheck /> : <IconAlerta />}
      <span>{children}</span>
    </p>
  );
}
