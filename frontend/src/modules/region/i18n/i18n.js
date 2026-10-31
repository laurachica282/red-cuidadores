import { useEffect, useSyncExternalStore } from 'react';
import es from './es.js';
import en from './en.js';
import pt from './pt.js';

export const IDIOMAS = ['es', 'en', 'pt'];
const DICCIONARIOS = { es, en, pt };

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

export function cambiarIdioma(idioma) {
  if (!IDIOMAS.includes(idioma) || idioma === actual) return;
  actual = idioma;
  try { localStorage.setItem('idioma', idioma); } catch { /* ignorar */ }
  oyentes.forEach((fn) => fn());
}

// Guarda en la sesión local el país, idioma y moneda que devolvió el servidor.
export function guardarRegionLocal({ pais, idioma, moneda }) {
  try {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (u) localStorage.setItem('usuario', JSON.stringify({ ...u, pais, idioma, moneda }));
  } catch { /* ignorar */ }
  cambiarIdioma(idioma);
}

export function useIdioma() {
  const idioma = useSyncExternalStore(suscribir, () => actual);

  // Al entrar a una pantalla se alinea con el idioma guardado de la persona.
  useEffect(() => { cambiarIdioma(leerAlmacen()); }, []);

  const t = (clave, vars = {}) => {
    const texto = DICCIONARIOS[idioma][clave] ?? es[clave] ?? clave;
    return texto.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };
  const fecha = (valor) => new Date(valor).toLocaleDateString(idioma, { day: 'numeric', month: 'long', year: 'numeric' });
  const precio = (valor, moneda) => formatearPrecio(valor, moneda, idioma);
  return { idioma, t, fecha, precio };
}

const LOCALES = { es: 'es-CO', en: 'en-US', pt: 'pt-BR' };

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
