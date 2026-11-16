const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// En el plan gratis de Render el backend se duerme y tarda ~30-60 s en arrancar con la primera petición.
// Se llama al abrir la app para que vaya despertando mientras la persona ve el login. No espera ni avisa errores.
export function despertarServidor() {
  fetch(`${API}/salud`, { cache: 'no-store' }).catch(() => {});
}

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
    throw new Error('No hay conexión con el servidor');
  }
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // Aviso global para que el módulo auth cierre la sesión local (ver AuthContext).
    if (datos.codigo === 'SESION_CERRADA') window.dispatchEvent(new Event('sesion-cerrada'));
    throw Object.assign(new Error(datos.error ?? 'Algo salió mal. Inténtalo de nuevo.'), {
      status: resp.status,
      codigo: datos.codigo,
      datos,
    });
  }
  return datos;
}