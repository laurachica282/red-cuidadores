// País a partir de coordenadas, con Nominatim (OpenStreetMap): gratis, sin clave.
const BASE = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
const AGENTE = 'RedCuidadores/1.0 (proyecto universitario)';
const cache = new Map();

export async function paisDeCoordenadas(lat, lng) {
  const clave = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (cache.has(clave)) return cache.get(clave);

  const params = new URLSearchParams({
    format: 'jsonv2', zoom: '3', lat: String(lat), lon: String(lng), 'accept-language': 'es',
  });
  const r = await fetch(`${BASE}/reverse?${params}`, {
    headers: { 'User-Agent': AGENTE },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Nominatim respondió ${r.status}`);

  const d = await r.json();
  const codigo = d.address?.country_code?.toUpperCase();
  const resultado = codigo ? { pais: codigo, nombre: d.address.country } : null;
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  cache.set(clave, resultado);
  return resultado;
}