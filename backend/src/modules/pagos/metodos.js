// Métodos de pago simulados. Cada método (menos la tarjeta, que tiene su propia validación) pide un solo dato.
//   valida(v)  -> ¿el dato tiene buen formato?
//   rechaza(v) -> la regla de prueba para simular que la entidad rechaza el pago
//   detalle(v) -> texto seguro para mostrar (nunca el dato completo)
const BANCOS = {
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
  bbva: 'BBVA',
  bogota: 'Banco de Bogotá',
  sin_fondos: 'Banco de prueba (sin fondos)',
};
const ultimos = (v) => `••••${String(v).slice(-4)}`;
const termina0002 = (v) => String(v).endsWith('0002');

export const METODOS = {
  tarjeta: { nombre: 'Tarjeta de crédito o débito' },
  paypal: {
    nombre: 'PayPal',
    valida: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    error: 'Escribe un correo de PayPal válido',
    rechaza: (v) => v.toLowerCase().includes('rechazar'),
    detalle: (v) => `PayPal (${v[0]}***${v.slice(v.indexOf('@'))})`,
  },
  pse: {
    nombre: 'PSE',
    valida: (v) => Object.hasOwn(BANCOS, v),
    error: 'Elige un banco',
    rechaza: (v) => v === 'sin_fondos',
    detalle: (v) => `PSE · ${BANCOS[v]}`,
  },
  nequi: {
    nombre: 'Nequi',
    valida: (v) => /^3\d{9}$/.test(v),
    error: 'El celular debe tener 10 dígitos y empezar por 3',
    rechaza: termina0002,
    detalle: (v) => `Nequi ${ultimos(v)}`,
  },
  spei: {
    nombre: 'SPEI',
    valida: (v) => /^\d{18}$/.test(v),
    error: 'La CLABE debe tener 18 dígitos',
    rechaza: termina0002,
    detalle: (v) => `SPEI ${ultimos(v)}`,
  },
  oxxo: {
    nombre: 'OXXO',
    valida: (v) => v.length >= 3 && v.length <= 60,
    error: 'Escribe tu nombre completo',
    rechaza: () => false,
    detalle: () => 'OXXO · pago en efectivo',
  },
  pix: {
    nombre: 'Pix',
    valida: (v) => /^\d{11}$/.test(v),
    error: 'El CPF debe tener 11 dígitos',
    rechaza: termina0002,
    detalle: (v) => `Pix ${ultimos(v)}`,
  },
};