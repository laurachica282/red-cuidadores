const LOCALE_POR_MONEDA = {
  COP: 'es-CO', MXN: 'es-MX', PEN: 'es-PE', CLP: 'es-CL', ARS: 'es-AR', BRL: 'pt-BR', USD: 'en-US', EUR: 'es-ES',
};
const SIN_DECIMALES = ['COP', 'CLP'];

// HU-35: muestra un valor con el formato de la moneda del usuario.
// Solo da formato: no convierte entre monedas (eso necesita una fuente de tasas de cambio).
export function formatearPrecio(valor, moneda = 'COP') {
  const decimales = SIN_DECIMALES.includes(moneda) ? 0 : 2;
  return new Intl.NumberFormat(LOCALE_POR_MONEDA[moneda] ?? 'es-CO', {
    style: 'currency',
    currency: moneda,
    // 85 -> "US$85", 85.5 -> "US$85.50": nunca medio decimal.
    minimumFractionDigits: Number.isInteger(valor) ? 0 : decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}
