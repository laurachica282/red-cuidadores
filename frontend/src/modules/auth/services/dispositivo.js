const CLAVE = 'dispositivoId';

// crypto.randomUUID solo existe en contextos seguros (https o localhost); en http de red local se arma a mano.
const nuevoUuid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

// Identifica este navegador para la verificación en dos pasos. Sin almacenamiento, cada login cuenta como equipo nuevo.
export function obtenerDispositivoId() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return guardado;
    const id = nuevoUuid();
    localStorage.setItem(CLAVE, id);
    return id;
  } catch {
    return nuevoUuid();
  }
}
