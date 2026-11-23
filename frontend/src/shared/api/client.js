import { traducirMensajeServidor } from './mensajesServidor.js';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// En el plan gratis de Render el backend se duerme y tarda ~30-60 s en arrancar con la primera petición.
// Se llama al abrir la app para que vaya despertando mientras la persona ve el login. No espera ni avisa errores.
export function despertarServidor() {
  fetch(`${API}/salud`, { cache: 'no-store' }).catch(() => {});
}

// Idioma de la interfaz (lo marca region en <html lang>) para los avisos propios del cliente.
const idioma = () => (typeof document !== 'undefined' && document.documentElement.lang) || 'es';
const SIN_CONEXION = { es: 'No hay conexión con el servidor', en: 'Cannot connect to the server', pt: 'Sem conexão com o servidor' };
const ALGO_FALLO = { es: 'Algo salió mal. Inténtalo de nuevo.', en: 'Something went wrong. Please try again.', pt: 'Algo deu errado. Tente novamente.' };

export async function api(ruta, { metodo = 'GET', cuerpo } = {}) {
  const token = localStorage.getItem('token');
  let resp;
  try {
    resp = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Error(SIN_CONEXION[idioma()] ?? SIN_CONEXION.es);
  }
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // Aviso global para que el módulo auth cierre la sesión local (ver AuthContext).
    if (datos.codigo === 'SESION_CERRADA') window.dispatchEvent(new Event('sesion-cerrada'));
    // El servidor responde en español: se traduce al idioma de la interfaz y se guarda el original.
    throw Object.assign(new Error(traducirMensajeServidor(datos.error) ?? ALGO_FALLO[idioma()] ?? ALGO_FALLO.es), {
      status: resp.status,
      original: datos.error,
      codigo: datos.codigo,
      datos,
    });
  }
  return datos;
}