import { useEffect, useSyncExternalStore } from 'react';
import es from './es.js';
import en from './en.js';
import pt from './pt.js';

export const IDIOMAS = ['es', 'en', 'pt'];
const DICCIONARIOS = { es: { ...es }, en: { ...en }, pt: { ...pt } };

// Textos que registran los módulos. Se guardan aparte para volver a aplicarlos si este archivo se recarga
// (recarga en caliente de Vite en desarrollo); en producción solo se cargan una vez.
const REGISTRADOS = (globalThis.__textosModulos ??= []);
const aplicar = (textos) => { for (const idioma of IDIOMAS) Object.assign(DICCIONARIOS[idioma], textos[idioma] ?? {}); };
REGISTRADOS.forEach(aplicar);

// Cada módulo registra sus propios textos con agregarTextos({ es: {...}, en: {...}, pt: {...} }),
// en un archivo i18n.js del módulo que importan sus pantallas. Así nadie edita el diccionario de otro.
export function agregarTextos(textos) {
  REGISTRADOS.push(textos);
  aplicar(textos);
}

// El idioma de quien inició sesión manda; si no hay sesión, el último elegido.
const leerAlmacen = () => {
  try {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (u && IDIOMAS.includes(u.idioma)) return u.idioma;
    const g = localStorage.getItem('idioma');
    if (IDIOMAS.includes(g)) return g;
  } catch { /* sin almacenamiento: se usa español */ }
  return 'es';
};

let actual = leerAlmacen();
const oyentes = new Set();
const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };

// <html lang> sigue al idioma (lectores de pantalla, traductor del navegador, guiones).
const marcarDocumento = () => { if (typeof document !== 'undefined') document.documentElement.lang = actual; };
marcarDocumento();

export function cambiarIdioma(idioma) {
  if (!IDIOMAS.includes(idioma) || idioma === actual) return;
  actual = idioma;
  try { localStorage.setItem('idioma', idioma); } catch { /* ignorar */ }
  marcarDocumento();
  oyentes.forEach((fn) => fn());
}

// El idioma se vuelve a leer apenas cambia la sesión, sin esperar a que monte una pantalla con useIdioma:
// - 'usuario-actualizado': login o cambio del usuario en esta pestaña (lo emite AuthContext).
// - 'storage': otra pestaña del navegador cambió la sesión o el idioma.
if (typeof window !== 'undefined') {
  window.addEventListener('usuario-actualizado', () => cambiarIdioma(leerAlmacen()));
  window.addEventListener('storage', (e) => {
    if (e.key === 'usuario' || e.key === 'idioma') cambiarIdioma(leerAlmacen());
  });
}

// Guarda en la sesión local el país, idioma y moneda que devolvió el servidor.
export function guardarRegionLocal({ pais, idioma, moneda }) {
  try {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (u) localStorage.setItem('usuario', JSON.stringify({ ...u, pais, idioma, moneda }));
  } catch { /* ignorar */ }
  cambiarIdioma(idioma);
  // AuthContext escucha este aviso para que usuario.pais / usuario.moneda no queden con los valores anteriores.
  window.dispatchEvent(new CustomEvent('region-cambiada', { detail: { pais, idioma, moneda } }));
}

// Idioma actual fuera de React (utilidades .js, servicios). Las pantallas usan useIdioma para re-renderizar.
export const idiomaActual = () => actual;

const LOCALES = { es: 'es-CO', en: 'en-US', pt: 'pt-BR' };
// Locale de Intl para el idioma actual (fechas, números, horas).
export const localeActual = (idioma = actual) => LOCALES[idioma] ?? 'es-CO';

// Traduce fuera de un componente. Dentro de un componente, usar el t de useIdioma.
export function traducir(clave, vars = {}, idioma = actual) {
  const texto = DICCIONARIOS[idioma]?.[clave] ?? DICCIONARIOS.es[clave] ?? clave;
  return String(texto).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Nombre del país en el idioma actual a partir del código ISO (CO, MX, BR, US, ES).
export function nombrePais(codigo, idioma = actual) {
  try { return new Intl.DisplayNames([localeActual(idioma)], { type: 'region' }).of(codigo) ?? codigo; }
  catch { return codigo; }
}

export function useIdioma() {
  const idioma = useSyncExternalStore(suscribir, () => actual);

  // Al entrar a una pantalla se alinea con el idioma guardado de la persona.
  useEffect(() => { cambiarIdioma(leerAlmacen()); }, []);

  const t = (clave, vars = {}) => traducir(clave, vars, idioma);
  const locale = localeActual(idioma);
  const fecha = (valor) => new Date(valor).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const precio = (valor, moneda) => formatearPrecio(valor, moneda, idioma);
  return { idioma, locale, t, fecha, precio, pais: (c) => nombrePais(c, idioma) };
}

// Precio en la moneda indicada y con el formato del idioma (ej.: $ 50.000 / US$45 / R$ 50).
export function formatearPrecio(valor, moneda = 'COP', idioma = 'es') {
  try {
    return new Intl.NumberFormat(LOCALES[idioma] ?? 'es-CO', {
      style: 'currency', currency: moneda, maximumFractionDigits: 0,
    }).format(valor);
  } catch {
    return `${valor} ${moneda}`;
  }
}
