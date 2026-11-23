// Validación de los datos de cobro en el navegador (mismas reglas que backend/src/modules/cuidadores/cobro.js),
// para mostrar el error en el idioma de la persona antes de enviar.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Formato del número según el tipo de cuenta o billetera (lo devuelve el servidor en `opciones`).
export const VALIDA = {
  cuenta: (n) => /^\d{9,16}$/.test(n),
  clabe: (n) => /^\d{18}$/.test(n),
  iban: (n) => /^ES\d{22}$/.test(n),
  agencia: (n) => /^\d{4}(-\d)?\/\d{3,12}-[\dX]$/i.test(n),
  routing: (n) => /^\d{9}\/\d{4,17}$/.test(n),
  celular: (n) => /^3\d{9}$/.test(n),
  movil: (n) => /^[67]\d{8}$/.test(n),
  mercadopago: (n) => /^\d{10}$/.test(n) || /^\d{18}$/.test(n) || EMAIL.test(n),
  pix: (n) => /^\d{11}$/.test(n) || /^\d{14}$/.test(n) || /^\+55\d{10,11}$/.test(n) || EMAIL.test(n) || UUID.test(n),
  correo: (n) => EMAIL.test(n),
};

// Limpia lo que escribió la persona (espacios, puntos) como lo hace el servidor.
export function limpiarNumero(texto, formato) {
  const t = String(texto ?? '').trim();
  if (t.includes('@') || UUID.test(t)) return t.toLowerCase();
  if (formato === 'pix' && /^\+/.test(t)) return `+${t.replace(/\D/g, '')}`;
  if (formato === 'pix') return t.replace(/[\s.\-/]/g, '');
  const n = t.replace(/[\s.]/g, '');
  return formato === 'iban' ? n.toUpperCase() : n;
}

// Documento sugerido por país (solo como ejemplo en el campo).
export const DOCUMENTO_PAIS = { CO: 'Cédula', MX: 'CURP / RFC', BR: 'CPF', US: 'SSN / ITIN', ES: 'DNI / NIE' };
