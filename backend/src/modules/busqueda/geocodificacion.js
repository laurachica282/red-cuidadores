// Direcciones ↔ coordenadas con Nominatim (OpenStreetMap). Gratis, sin clave, pero con reglas de uso:
// máximo 1 petición por segundo y un User-Agent que identifique la app.
// https://operations.osmfoundation.org/policies/nominatim/
const BASE = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
const AGENTE = `RedCuidadores/1.0 (proyecto universitario${process.env.NOMINATIM_CONTACTO ? `; ${process.env.NOMINATIM_CONTACTO}` : ''})`;
const ESPERA_MS = 1100;
const CACHE_MAX = 500;
const CACHE_MS = 24 * 60 * 60 * 1000;

const cache = new Map();
let cola = Promise.resolve();
let ultima = 0;

// Las peticiones salen de una en una, separadas al menos ESPERA_MS.
function enCola(fn) {
  const turno = cola.then(async () => {
    const falta = ultima + ESPERA_MS - Date.now();
    if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    ultima = Date.now();
    return fn();
  });
  cola = turno.catch(() => {});
  return turno;
}

async function pedir(ruta, params) {
  const url = `${BASE}${ruta}?${new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'es', ...params })}`;
  const guardado = cache.get(url);
  if (guardado && guardado.vence > Date.now()) return guardado.datos;

  const datos = await enCola(async () => {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Nominatim respondió ${r.status}`);
    return r.json();
  });
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(url, { datos, vence: Date.now() + CACHE_MS });
  return datos;
}

// OpenStreetMap en Colombia trae nombres administrativos ("UPZs de Bogotá", "Localidad Chapinero",
// "Bogotá ciudad"); se limpian para mostrar lo que la gente reconoce.
const limpiar = (t) => t?.replace(/^Localidad\s+/i, '').replace(/ ciudad$/i, '').trim() || null;
const esAdministrativo = (t) => !t || /^UPZ/i.test(t);

// Texto corto y legible: "Calle 85, Entre Ríos, Bogotá".
function aDireccion(r) {
  const a = r.address ?? {};
  const calle = [a.road, a.house_number].filter(Boolean).join(' ');
  const barrio = limpiar([a.neighbourhood, a.quarter, a.suburb, a.city_district].find((b) => !esAdministrativo(b)));
  const ciudad = limpiar(a.city ?? a.town ?? a.village ?? a.municipality ?? a.county);
  const partes = [calle || limpiar(r.name), barrio, ciudad].filter((p, i, arr) => p && arr.indexOf(p) === i);
  return {
    etiqueta: partes.length ? partes.join(', ') : r.display_name,
    barrio,
    ciudad,
    lat: Number(r.lat),
    lng: Number(r.lon),
  };
}

// cerca: { lat, lng } opcional; da prioridad a lo que esté a ~30 km de ese punto (no excluye lo demás).
export async function buscarDirecciones(texto, pais, cerca) {
  const params = { q: texto, limit: '8', ...(pais && { countrycodes: pais.toLowerCase() }) };
  if (cerca) {
    const d = 0.3;
    params.viewbox = [cerca.lng - d, cerca.lat + d, cerca.lng + d, cerca.lat - d].map((n) => n.toFixed(4)).join(',');
  }
  const r = await pedir('/search', params);
  // Sin zonas administrativas (UPZ) ni lugares repetidos con el mismo nombre.
  const vistos = new Set();
  return r
    .filter((x) => !esAdministrativo(x.name ?? 'x'))
    .map(aDireccion)
    .filter((d) => !vistos.has(d.etiqueta) && vistos.add(d.etiqueta))
    .slice(0, 5);
}

export async function direccionDe(lat, lng) {
  const r = await pedir('/reverse', { lat: String(lat), lon: String(lng), zoom: '17' });
  return r?.error ? null : aDireccion(r);
}
