// Traduce textos escritos por personas (reseñas) con MyMemory: gratis, sin clave y detecta solo el idioma original.
// Límite del plan gratis: ~5.000 caracteres al día por navegador; por eso se traduce solo cuando la persona lo pide.
const URL = 'https://api.mymemory.translated.net/get';
const CODIGOS = { es: 'es', en: 'en', pt: 'pt-BR' };
const cache = new Map();

// Devuelve { texto, origen } o { mismoIdioma: true } si ya está en el idioma pedido.
export async function traducirTexto(texto, destino) {
  const clave = `${destino}|${texto}`;
  if (cache.has(clave)) return cache.get(clave);

  const q = new URLSearchParams({ q: texto, langpair: `Autodetect|${CODIGOS[destino] ?? destino}` });
  const resp = await fetch(`${URL}?${q}`);
  const datos = await resp.json().catch(() => ({}));
  const detalle = String(datos.responseDetails ?? '');

  let resultado;
  if (/DISTINCT LANGUAGES/i.test(detalle)) {
    resultado = { mismoIdioma: true };
  } else if (String(datos.responseStatus) === '200' && datos.responseData?.translatedText) {
    const origen = String(datos.responseData.detectedLanguage ?? '').slice(0, 2).toLowerCase();
    resultado = origen === destino ? { mismoIdioma: true } : { texto: datos.responseData.translatedText, origen };
  } else {
    throw new Error(detalle || 'traduccion');
  }
  cache.set(clave, resultado);
  return resultado;
}
