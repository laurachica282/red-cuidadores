import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarCodigo, hashCodigo } from '../codigos.js';
import { enmascarar } from '../correo.js';
import { tipoDeImagen } from '../fotos.js';
import { crearIntegraciones } from '../integraciones.js';
import { esquemas } from '../validacion.js';
import { monedaDelPais } from '../regiones.js';
import { JPG, PNG } from './ayudas.js';

test('los códigos son de 6 dígitos y el hash depende de usuario, propósito y código', () => {
  for (let i = 0; i < 200; i++) assert.match(generarCodigo(), /^\d{6}$/);
  const base = hashCodigo('123456', 1, 'cambio_correo');
  assert.equal(base, hashCodigo('123456', 1, 'cambio_correo'));
  assert.notEqual(base, hashCodigo('123457', 1, 'cambio_correo'));
  assert.notEqual(base, hashCodigo('123456', 2, 'cambio_correo'));
  assert.notEqual(base, hashCodigo('123456', 1, 'reactivacion'));
});

test('enmascarar no deja ver el correo completo', () => {
  assert.equal(enmascarar('carlos@correo.com'), 'c*****@correo.com');
  assert.equal(enmascarar('a@correo.com'), 'a***@correo.com');
  assert.equal(enmascarar('sin-arroba'), '***');
});

test('tipoDeImagen mira el contenido y no el nombre', () => {
  assert.equal(tipoDeImagen(PNG), 'png');
  assert.equal(tipoDeImagen(JPG), 'jpeg');
  assert.equal(tipoDeImagen(Buffer.from('<?php echo 1; ?> esto no es una imagen')), null);
  assert.equal(tipoDeImagen(Buffer.alloc(0)), null);
});

test('perfil: valida nombre y teléfono, y vacía con null', () => {
  const ok = esquemas.perfil.safeParse({ nombre: '  Ana Gómez ', telefono: '+57 300 123 4567', ciudad: '' });
  assert.equal(ok.success, true);
  assert.deepEqual(ok.data, { nombre: 'Ana Gómez', telefono: '+57 300 123 4567', ciudad: null });
  assert.equal(esquemas.perfil.safeParse({ nombre: 'A' }).success, false);
  assert.equal(esquemas.perfil.safeParse({ telefono: 'abc12345' }).success, false);
  assert.equal(esquemas.perfil.safeParse({}).success, false);
});

test('región: acepta idiomas, países y monedas conocidos', () => {
  assert.equal(esquemas.region.safeParse({ pais: 'MX' }).success, true);
  assert.equal(esquemas.region.safeParse({ moneda: 'EUR' }).success, true);
  assert.equal(esquemas.region.safeParse({ idioma: 'pt' }).success, true);
  assert.equal(esquemas.region.safeParse({ idioma: 'fr' }).success, false);
  assert.equal(esquemas.region.safeParse({ pais: 'ZZ' }).success, false);
  assert.equal(esquemas.region.safeParse({}).success, false);
  assert.equal(monedaDelPais('CO'), 'COP');
  assert.equal(monedaDelPais('ZZ'), undefined);
});

test('notificaciones: solo eventos y canales conocidos', () => {
  assert.equal(esquemas.notificaciones.safeParse({ eventos: { reservas: false }, canales: { sms: true } }).success, true);
  assert.equal(esquemas.notificaciones.safeParse({ eventos: { otro: true } }).success, false);
  assert.equal(esquemas.notificaciones.safeParse({ canales: { fax: true } }).success, false);
  assert.equal(esquemas.notificaciones.safeParse({ eventos: {}, canales: {} }).success, false);
  assert.equal(esquemas.notificaciones.safeParse({}).success, false);
});

test('reseña: calificación de 1 a 5', () => {
  const base = { reserva_id: 3, comentario: '  Muy bien  ' };
  assert.equal(esquemas.resena.safeParse({ ...base, calificacion: 5 }).data.comentario, 'Muy bien');
  for (const mala of [0, 6, 2.5, '4']) assert.equal(esquemas.resena.safeParse({ ...base, calificacion: mala }).success, false);
});

test('integraciones: sin verificaciones registradas no hay pendientes, con ellas se suman', async () => {
  const i = crearIntegraciones();
  assert.deepEqual(await i.pendientesPazYSalvo({ usuarioId: 1, rol: 'viajero' }), []);
  assert.equal(i.verificacionesSinRegistrar().length, 4);

  i.registrarVerificacionPazYSalvo('reservas_activas', async () => 2);
  i.registrarVerificacionPazYSalvo('pagos_pendientes', async () => ({ cantidad: 1, detalle: 'Reserva 9' }));
  i.registrarVerificacionPazYSalvo('disputas_abiertas', () => 0);
  assert.throws(() => i.registrarVerificacionPazYSalvo('inventada', () => 1));

  const p = await i.pendientesPazYSalvo({ usuarioId: 1, rol: 'viajero' });
  assert.deepEqual(p.map((x) => [x.codigo, x.cantidad]), [['reservas_activas', 2], ['pagos_pendientes', 1]]);
  assert.equal(p[1].detalle, 'Reserva 9');
  assert.deepEqual(i.verificacionesSinRegistrar(), ['saldo_sin_liquidar']);

  // La lista completa (para el checklist de "Antes de irte") trae las 4 verificaciones.
  const todas = await i.verificacionesPazYSalvo({ usuarioId: 1, rol: 'viajero' });
  assert.deepEqual(todas.map((v) => [v.codigo, v.cantidad]),
    [['reservas_activas', 2], ['pagos_pendientes', 1], ['disputas_abiertas', 0], ['saldo_sin_liquidar', 0]]);
});
