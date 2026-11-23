import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarMensaje } from './chat.filtro.js';

const bloquea = (texto, motivo) => {
  const r = filtrarMensaje(texto);
  assert.equal(r.permitido, false, `debía bloquear: "${texto}"`);
  if (motivo) assert.ok(r.motivos.includes(motivo), `"${texto}" debía tener motivo ${motivo}, tuvo ${r.motivos}`);
};
const permite = (texto) => {
  const r = filtrarMensaje(texto);
  assert.equal(r.permitido, true, `debía permitir: "${texto}" (motivos: ${r.motivos})`);
};

test('bloquea teléfonos en varios formatos', () => {
  bloquea('Llámame al 3001234567', 'telefono');
  bloquea('mi cel es 300 123 4567', 'telefono');
  bloquea('300-123-4567', 'telefono');
  bloquea('+57 (300) 123 45 67', 'telefono');
  bloquea('3 0 0 1 2 3 4 5 6 7', 'telefono');
  bloquea('tres cero cero uno dos tres cuatro cinco seis siete', 'telefono');
});

test('bloquea enlaces', () => {
  bloquea('mira https://miweb.com/perfil', 'enlace');
  bloquea('entra a www.ejemplo.co', 'enlace');
  bloquea('escríbeme en gmail.com', 'enlace');
  bloquea('bit.ly/abc123', 'enlace');
  bloquea('wa.me/573001234567', 'enlace');
  bloquea('midominio punto com', 'enlace');
});

test('bloquea correos', () => {
  bloquea('juan@correo.com', 'correo');
  bloquea('juan (at) correo punto com', 'correo');
  bloquea('juan arroba correo', 'correo');
});

test('bloquea canales externos', () => {
  bloquea('pásame tu WhatsApp', 'canal_externo');
  bloquea('sígueme en Instagram', 'canal_externo');
  bloquea('mi usuario es @juan_perez', 'canal_externo');
});

test('permite conversación normal sobre la mascota y la reserva', () => {
  permite('Hola, Luna pesa 18 kilos y es alérgica al pollo');
  permite('Llego el 3 de noviembre a las 10 de la mañana');
  permite('La reserva es del 12 al 15 de noviembre');
  permite('Luna tiene 2 años y 3 meses');
  permite('El microchip es de la marca X, gracias');
  permite('Fecha de entrega: 2026-11-03');
  permite('La tarifa es $50.000 por noche');
  permite('Son 1.050.000 pesos en total');
  permite('Tengo dos perros y tres gatos');
  permite('Hola.Me gustaría saber si tienes espacio');
  permite('');
});

test('después de pagar se permite todo', () => {
  const r = filtrarMensaje('Mi número es 3001234567', { reservaPagada: true });
  assert.equal(r.permitido, true);
});

test('el bloqueo trae un mensaje explicativo y no falla con valores raros', () => {
  const r = filtrarMensaje('3001234567');
  assert.ok(r.mensaje.includes('antes de pagar'));
  assert.equal(filtrarMensaje(undefined).permitido, true);
  assert.equal(filtrarMensaje(null).permitido, true);
});
