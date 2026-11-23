// `texto` es la clave de traducción; ReglasClave la traduce al dibujar.
export const REGLAS = [
  { id: 'largo', texto: 'auth.reglas.largo', cumple: (c) => c.length >= 8 },
  { id: 'mayuscula', texto: 'auth.reglas.mayuscula', cumple: (c) => /[A-Z]/.test(c) },
  { id: 'numero', texto: 'auth.reglas.numero', cumple: (c) => /\d/.test(c) },
];

export const claveValida = (clave) => REGLAS.every((r) => r.cumple(clave));
