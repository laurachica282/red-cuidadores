// HU-29: el chat queda dentro de la plataforma.
// Antes de pagar se bloquean teléfonos, correos, enlaces y canales externos.
// Después de pagar se permite todo. Es una función pura: no toca la base de datos.

const MENSAJE_BLOQUEO =
  'Por tu seguridad, no puedes compartir teléfonos, correos ni enlaces externos ' +
  'antes de pagar. Cuando la reserva esté pagada podrás hacerlo.';

// Minúsculas y sin tildes, para que "TELÉFONO" y "telefono" se traten igual
function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Fechas (2026-11-03, 03/11/2026) y montos con moneda ($1.050.000): no son teléfonos
function quitarFechasYMontos(t) {
  return t
    .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, ' ')
    .replace(/(?:\$|usd|cop|mxn|brl|r\$)\s*\d[\d.,\s]*/g, ' ')
    .replace(/\b\d[\d.,]*\s*(?:pesos|cop|usd|dolares|reales|mil)\b/g, ' ');
}

const PALABRAS_NUMERO =
  'cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|' +
  'zero|one|two|three|four|five|six|seven|eight|nine|' +
  'um|dois|quatro|sete|oito|nove';

const REGLAS = [
  {
    motivo: 'enlace',
    prueba: (t) =>
      /(?:https?:\/\/|www\.)\S+/.test(t) ||
      /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|ly|link|app|xyz|info|edu|gov)\b/.test(t) ||
      /\b(?:wa|t)\.me\b/.test(t) ||
      /\b[a-z0-9-]+\s+punto\s+(?:com|net|org|co|io)\b/.test(t),
  },
  {
    motivo: 'correo',
    prueba: (t) =>
      /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9.-]+/.test(t) ||
      /\b[a-z0-9._-]+\s+arroba\s+[a-z0-9.-]+/.test(t),
  },
  {
    motivo: 'telefono',
    prueba: (t) => {
      const limpio = quitarFechasYMontos(t);
      // 7 o más dígitos, aunque vengan separados por espacios, guiones, puntos o paréntesis
      const digitos = limpio.match(/(?:\+?\d[\s.\-()]*){7,}/g) ?? [];
      if (digitos.some((g) => g.replace(/\D/g, '').length >= 7)) return true;
      // Números escritos con letras: "tres cero cinco uno dos tres cuatro"
      const palabras = new RegExp(`(?:\\b(?:${PALABRAS_NUMERO})\\b[\\s,.\\-]*){7,}`);
      return palabras.test(limpio);
    },
  },
  {
    motivo: 'canal_externo',
    prueba: (t) =>
      /\b(?:whats\s*app|wasap|watsap|telegram|instagram|facebook|messenger|tiktok|signal)\b/.test(t) ||
      /(?:^|\s)@[a-z0-9_.]{3,}/.test(t),
  },
];

/**
 * Revisa un mensaje del chat.
 * @param {string} texto
 * @param {{ reservaPagada?: boolean }} [opciones]
 * @returns {{ permitido: boolean, motivos: string[], mensaje: string|null }}
 */
export function filtrarMensaje(texto, { reservaPagada = false } = {}) {
  if (reservaPagada) return { permitido: true, motivos: [], mensaje: null };

  const t = normalizar(texto);
  const motivos = REGLAS.filter((r) => r.prueba(t)).map((r) => r.motivo);
  return motivos.length
    ? { permitido: false, motivos, mensaje: MENSAJE_BLOQUEO }
    : { permitido: true, motivos: [], mensaje: null };
}
