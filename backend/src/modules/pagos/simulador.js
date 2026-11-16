import crypto from 'node:crypto';
import { METODOS } from './metodos.js';

// Pasarela simulada: no toca dinero real. Todas las pasarelas del proyecto se comportan igual.
// Reglas de prueba para rechazar (el resto se aprueba):
//   tarjeta, nequi, spei, pix: dato que termina en 0002 · paypal: correo con la palabra "rechazar" · pse: "Banco de prueba (sin fondos)".
export function simularCobro({ metodo, valor }, pasarela) {
  const prefijo = String(pasarela).split('_')[0].slice(0, 4).toUpperCase();
  const referencia = `${prefijo}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const rechazado = metodo === 'tarjeta' ? valor.endsWith('0002') : METODOS[metodo].rechaza(valor);
  if (rechazado) return { aprobado: false, referencia, motivo: 'El pago fue rechazado. Prueba con otro dato o con otro método' };
  return { aprobado: true, referencia };
}