import crypto from 'node:crypto';

// Pasarela simulada: no toca dinero real. Todas las pasarelas del proyecto se comportan igual.
// Regla de prueba: una tarjeta que termina en 0002 es rechazada; cualquier otra se aprueba.
export function simularCobro({ numero }, pasarela) {
  const prefijo = String(pasarela).split('_')[0].slice(0, 4).toUpperCase();
  const referencia = `${prefijo}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  if (numero.endsWith('0002')) {
    return { aprobado: false, referencia, motivo: 'El banco rechazó la tarjeta. Prueba con otra' };
  }
  return { aprobado: true, referencia };
}