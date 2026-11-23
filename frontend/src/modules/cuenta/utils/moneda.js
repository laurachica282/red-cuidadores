const LOCALE_POR_MONEDA = {
  COP: 'es-CO', MXN: 'es-MX', PEN: 'es-PE', CLP: 'es-CL', ARS: 'es-AR', BRL: 'pt-BR', USD: 'en-US', EUR: 'es-ES',
};
const LOCALE_POR_IDIOMA = { es: 'es-CO', en: 'en-US', pt: 'pt-BR' };
const SIN_DECIMALES = ['COP', 'CLP'];

// Locale del idioma de la interfaz (<html lang>, lo mantiene el módulo region). Sin documento
// (pruebas con node) se usa el de la moneda.
const localeDeInterfaz = () => {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
  return LOCALE_POR_IDIOMA[lang];
};

// HU-35: muestra un valor con el formato de la moneda del usuario, en el idioma de la interfaz.
// Solo da formato: no convierte entre monedas (eso necesita una fuente de tasas de cambio).
export function formatearPrecio(valor, moneda = 'COP', locale = localeDeInterfaz()) {
  const decimales = SIN_DECIMALES.includes(moneda) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale ?? LOCALE_POR_MONEDA[moneda] ?? 'es-CO', {
      style: 'currency',
      currency: moneda,
      // 85 -> "US$85", 85.5 -> "US$85.50": nunca medio decimal.
      minimumFractionDigits: Number.isInteger(valor) ? 0 : decimales,
      maximumFractionDigits: decimales,
    }).format(valor);
  } catch {
    return `${valor} ${moneda}`;
  }
}
