// Pruebas de las utilidades puras. Se corren con: npm run test:cuenta
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatearPrecio } from './moneda.js';
import {
  enmascarar, limpiarCodigo, validarCiudad, validarCodigo, validarCorreo, validarNombre, validarTelefono,
} from './validaciones.js';
import { ETIQUETA_MOTIVO, MOTIVOS, fecha } from './textos.js';

test('formatearPrecio: pesos sin decimales y otras monedas con su formato', () => {
  assert.match(formatearPrecio(85000, 'COP'), /85\.000/);
  assert.doesNotMatch(formatearPrecio(85000, 'COP'), /,00/);
  assert.match(formatearPrecio(1250.5, 'USD'), /1,250\.50/);
  assert.match(formatearPrecio(20, 'EUR'), /20/);
  assert.match(formatearPrecio(100, 'XYZ'), /100/); // moneda desconocida: no revienta
});

test('validarNombre', () => {
  assert.equal(validarNombre('Ana'), '');
  assert.notEqual(validarNombre(' A '), '');
  assert.notEqual(validarNombre('x'.repeat(121)), '');
});

test('validarTelefono: vacío es válido, letras no', () => {
  assert.equal(validarTelefono(''), '');
  assert.equal(validarTelefono('+57 300 123 4567'), '');
  assert.equal(validarTelefono('300-123-4567'), '');
  assert.notEqual(validarTelefono('abc12345'), '');
  assert.notEqual(validarTelefono('123'), '');
});

test('validarCiudad', () => {
  assert.equal(validarCiudad(''), '');
  assert.equal(validarCiudad('Bogotá'), '');
  assert.notEqual(validarCiudad('B'), '');
});

test('validarCorreo', () => {
  assert.equal(validarCorreo(' nombre@correo.com '), '');
  for (const malo of ['', 'sin-arroba', 'a@b', 'a b@c.com', '@correo.com']) assert.notEqual(validarCorreo(malo), '', malo);
});

test('código: 6 dígitos, y limpiarCodigo deja solo números', () => {
  assert.equal(validarCodigo('123456'), '');
  assert.notEqual(validarCodigo('12345'), '');
  assert.notEqual(validarCodigo('12345a'), '');
  assert.equal(limpiarCodigo('12 34-56 789'), '123456');
  assert.equal(limpiarCodigo('abc'), '');
});

test('enmascarar no deja ver el correo completo', () => {
  assert.equal(enmascarar('carlos@correo.com'), 'c*****@correo.com');
  assert.equal(enmascarar('raro'), '***');
});

test('los motivos de desactivación tienen texto, y la suspensión también', () => {
  assert.equal(MOTIVOS.length, 5);
  for (const m of MOTIVOS) assert.ok(ETIQUETA_MOTIVO[m.valor]);
  assert.ok(ETIQUETA_MOTIVO.suspension);
});

test('fecha: vacío se muestra como raya', () => {
  assert.equal(fecha(null), '—');
  assert.match(fecha('2026-10-30T12:00:00Z'), /2026/);
});
