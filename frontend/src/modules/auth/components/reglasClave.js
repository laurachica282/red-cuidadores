export const REGLAS = [
  { id: 'largo', texto: '8 o más caracteres', cumple: (c) => c.length >= 8 },
  { id: 'mayuscula', texto: 'Una mayúscula', cumple: (c) => /[A-Z]/.test(c) },
  { id: 'numero', texto: 'Un número', cumple: (c) => /\d/.test(c) },
];

export const claveValida = (clave) => REGLAS.every((r) => r.cumple(clave));
