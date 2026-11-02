const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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
    throw Object.assign(new Error(datos.error ?? 'Algo salió mal. Inténtalo de nuevo.'), {
      status: resp.status,
      codigo: datos.codigo,
      datos,
    });
  }
  return datos;
}