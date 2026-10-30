// Pruebas de integración del módulo cuenta contra PostgreSQL real.
// Requieren una base vacía llamada red_cuidadores_test (ver README del módulo):
//   TEST_DB_PORT=5432 TEST_DB_PASSWORD=... npm test
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import request from 'supertest';
import {
  CLAVE, JPG, PNG, aplicarEsquema, conToken, crearPoolDePruebas, crearUsuario, envejecerCodigos, limpiar, montarApp,
} from './ayudas.js';

const pool = crearPoolDePruebas();
let ctx;

before(async () => { await aplicarEsquema(pool); });
after(async () => { await pool.end(); });
beforeEach(async () => { await limpiar(pool); ctx = await montarApp(pool); });

const api = () => request(ctx.app);
const get = (ruta, u) => conToken(api().get(`/api/cuenta${ruta}`), u);
const post = (ruta, u, cuerpo) => conToken(api().post(`/api/cuenta${ruta}`), u).send(cuerpo);
const patch = (ruta, u, cuerpo) => conToken(api().patch(`/api/cuenta${ruta}`), u).send(cuerpo);
const put = (ruta, u, cuerpo) => conToken(api().put(`/api/cuenta${ruta}`), u).send(cuerpo);
const fila = async (id) => (await pool.query('SELECT * FROM usuarios WHERE id = $1', [id])).rows[0];

describe('sesión', () => {
  test('sin token o con token inválido responde 401', async () => {
    assert.equal((await api().get('/api/cuenta/perfil')).status, 401);
    assert.equal((await api().get('/api/cuenta/perfil').set('Authorization', 'Bearer basura')).status, 401);
  });

  test('una cuenta desactivada pierde la sesión aunque su token no haya vencido', async () => {
    const u = await crearUsuario(pool);
    assert.equal((await get('/perfil', u)).status, 200);
    await pool.query('UPDATE usuarios SET status = FALSE WHERE id = $1', [u.id]);
    assert.equal((await get('/perfil', u)).status, 401);
  });

  test('rutas que no existen responden 404 en JSON', async () => {
    const u = await crearUsuario(pool);
    const r = await get('/no-existe', u);
    assert.equal(r.status, 404);
    assert.ok(r.body.error);
  });
});

describe('HU-09 · datos personales', () => {
  test('devuelve el perfil sin clave ni nombre interno de archivo', async () => {
    const u = await crearUsuario(pool, { nombre: 'Ana Gómez' });
    const r = await get('/perfil', u);
    assert.equal(r.status, 200);
    assert.equal(r.body.nombre, 'Ana Gómez');
    assert.equal(r.body.correo, u.correo);
    assert.equal(r.body.cambio_correo_pendiente, null);
    for (const prohibido of ['clave_hash', 'foto_url', 'status']) assert.ok(!(prohibido in r.body), prohibido);
  });

  test('edita nombre, teléfono y ciudad, y deja el resto igual', async () => {
    const u = await crearUsuario(pool);
    const r = await patch('/perfil', u, { nombre: 'Ana María', telefono: '+57 300 123 4567', ciudad: 'Bogotá' });
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.nombre, r.body.telefono, r.body.ciudad], ['Ana María', '+57 300 123 4567', 'Bogotá']);
    assert.equal(r.body.correo, u.correo);

    const solo = await patch('/perfil', u, { ciudad: 'Medellín' });
    assert.equal(solo.body.nombre, 'Ana María');
    assert.equal(solo.body.ciudad, 'Medellín');

    const vacio = await patch('/perfil', u, { telefono: '' });
    assert.equal(vacio.body.telefono, null);
  });

  test('el correo no se cambia desde aquí', async () => {
    const u = await crearUsuario(pool);
    const r = await patch('/perfil', u, { nombre: 'Otro Nombre', correo: 'hack@correo.com' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Cambiar correo/);
    assert.equal((await fila(u.id)).correo, u.correo);
    assert.equal((await fila(u.id)).nombre, u.nombre);
  });

  test('rechaza datos inválidos con el mensaje del campo', async () => {
    const u = await crearUsuario(pool);
    const r = await patch('/perfil', u, { nombre: 'A', telefono: 'no es un teléfono' });
    assert.equal(r.status, 400);
    assert.ok(r.body.campos.nombre);
    assert.ok(r.body.campos.telefono);
    assert.equal((await patch('/perfil', u, {})).status, 400);
  });

  test('no se puede editar el rol ni el estado por esta ruta', async () => {
    const u = await crearUsuario(pool);
    await patch('/perfil', u, { nombre: 'Ana Gómez', rol: 'admin', status: false, moneda: 'USD' });
    const f = await fila(u.id);
    assert.equal(f.rol, 'viajero');
    assert.equal(f.status, true);
    assert.equal(f.moneda, 'COP');
  });

  test('sube una foto, la sirve, la reemplaza borrando la anterior y la quita', async () => {
    const u = await crearUsuario(pool);
    const subida = await conToken(api().put('/api/cuenta/perfil/foto'), u).attach('foto', PNG, 'yo.png');
    assert.equal(subida.status, 200);
    assert.match(subida.body.foto, /^\/cuenta\/fotos\/[a-f0-9]{32}\.png$/);
    assert.ok(!('foto_url' in subida.body));

    const vista = await api().get(`/api${subida.body.foto}`);
    assert.equal(vista.status, 200);
    assert.equal(vista.headers['x-content-type-options'], 'nosniff');

    const nueva = await conToken(api().put('/api/cuenta/perfil/foto'), u).attach('foto', JPG, 'otra.jpg');
    assert.match(nueva.body.foto, /\.jpg$/);
    assert.deepEqual((await readdir(ctx.directorio)).length, 1);
    assert.equal((await api().get(`/api${subida.body.foto}`)).status, 404);

    const quitada = await conToken(api().delete('/api/cuenta/perfil/foto'), u);
    assert.equal(quitada.body.foto, null);
    assert.deepEqual(await readdir(ctx.directorio), []);
  });

  test('rechaza archivos que no son imágenes aunque se llamen .png', async () => {
    const u = await crearUsuario(pool);
    const r = await conToken(api().put('/api/cuenta/perfil/foto'), u)
      .attach('foto', Buffer.from('<script>alert(1)</script> contenido que no es una imagen'), 'falsa.png');
    assert.equal(r.status, 400);
    assert.deepEqual(await readdir(ctx.directorio), []);
  });

  test('rechaza fotos de más de 2 MB y peticiones sin archivo', async () => {
    const u = await crearUsuario(pool);
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    assert.equal((await conToken(api().put('/api/cuenta/perfil/foto'), u).attach('foto', grande, 'g.png')).status, 413);
    assert.equal((await conToken(api().put('/api/cuenta/perfil/foto'), u)).status, 400);
  });

  test('no sirve nombres de archivo que intentan salir de la carpeta', async () => {
    assert.equal((await api().get('/api/cuenta/fotos/..%2F..%2F.env')).status, 404);
    assert.equal((await api().get('/api/cuenta/fotos/passwd')).status, 404);
  });
});

describe('HU-06 · cambiar correo', () => {
  const nuevo = 'nuevo@correo.com';

  test('pide la contraseña actual', async () => {
    const u = await crearUsuario(pool);
    const r = await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: 'Incorrecta1' });
    assert.equal(r.status, 403);
    assert.equal(ctx.correo.enviados.length, 0);
  });

  test('rechaza el mismo correo, uno inválido y uno que ya tiene otra cuenta', async () => {
    const u = await crearUsuario(pool);
    const otro = await crearUsuario(pool);
    assert.equal((await post('/correo/solicitar', u, { correo_nuevo: u.correo.toUpperCase(), clave: CLAVE })).status, 400);
    assert.equal((await post('/correo/solicitar', u, { correo_nuevo: 'no-es-correo', clave: CLAVE })).status, 400);
    assert.equal((await post('/correo/solicitar', u, { correo_nuevo: otro.correo, clave: CLAVE })).status, 409);
  });

  test('flujo completo: no cambia hasta verificar, avisa al correo anterior y al confirmar', async () => {
    const u = await crearUsuario(pool);
    const s = await post('/correo/solicitar', u, { correo_nuevo: ' Nuevo@Correo.com ', clave: CLAVE });
    assert.equal(s.status, 200);

    // Aún no cambió, el código fue al correo nuevo y el aviso al anterior.
    assert.equal((await fila(u.id)).correo, u.correo);
    const codigo = ctx.correo.codigoPara(nuevo);
    assert.match(codigo, /^\d{6}$/);
    assert.equal(ctx.correo.para(u.correo).length, 1);
    assert.ok(!/\d{6}/.test(ctx.correo.para(u.correo)[0].texto), 'el aviso no debe llevar el código');
    assert.ok(!ctx.correo.para(u.correo)[0].texto.includes(nuevo), 'el aviso enmascara el correo nuevo');

    // La pantalla puede retomar el trámite.
    assert.equal((await get('/perfil', u)).body.cambio_correo_pendiente.correo_nuevo, nuevo);

    const c = await post('/correo/confirmar', u, { codigo });
    assert.equal(c.status, 200);
    const f = await fila(u.id);
    assert.equal(f.correo, nuevo);
    assert.equal(f.correo_verificado, true);
    assert.equal(ctx.correo.para(u.correo).length, 2, 'segundo aviso al correo anterior');
    assert.equal((await get('/perfil', u)).body.cambio_correo_pendiente, null);

    // El código es de un solo uso.
    assert.equal((await post('/correo/confirmar', u, { codigo })).status, 400);
  });

  test('en la base solo queda el HMAC del código, no el código', async () => {
    const u = await crearUsuario(pool);
    await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    const codigo = ctx.correo.codigoPara(nuevo);
    const { rows: [c] } = await pool.query('SELECT * FROM cuenta_codigos WHERE usuario_id = $1', [u.id]);
    assert.match(c.codigo_hash, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(c).includes(`"${codigo}"`));
  });

  test('el código vence a los 10 minutos', async () => {
    const u = await crearUsuario(pool);
    await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    const codigo = ctx.correo.codigoPara(nuevo);
    await pool.query("UPDATE cuenta_codigos SET expira_en = NOW() - INTERVAL '1 second' WHERE usuario_id = $1", [u.id]);
    const r = await post('/correo/confirmar', u, { codigo });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /venció/);
    assert.equal((await fila(u.id)).correo, u.correo);
  });

  test('máximo 5 intentos: ni siquiera el código correcto sirve después', async () => {
    const u = await crearUsuario(pool);
    await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    const bueno = ctx.correo.codigoPara(nuevo);
    const malo = bueno === '000000' ? '111111' : '000000';

    const primero = await post('/correo/confirmar', u, { codigo: malo });
    assert.equal(primero.status, 400);
    assert.equal(primero.body.intentos_restantes, 4);
    for (let i = 0; i < 4; i++) await post('/correo/confirmar', u, { codigo: malo });

    const bloqueado = await post('/correo/confirmar', u, { codigo: bueno });
    assert.equal(bloqueado.status, 429);
    assert.equal((await fila(u.id)).correo, u.correo);
  });

  test('intentos en paralelo no superan el límite', async () => {
    const u = await crearUsuario(pool);
    await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    const bueno = ctx.correo.codigoPara(nuevo);
    const malo = bueno === '000000' ? '111111' : '000000';
    await Promise.all(Array.from({ length: 12 }, () => post('/correo/confirmar', u, { codigo: malo })));
    const { rows: [c] } = await pool.query('SELECT intentos FROM cuenta_codigos WHERE usuario_id = $1', [u.id]);
    assert.equal(c.intentos, 5);
  });

  test('reenvío: espera 60 s, y el código nuevo invalida el anterior', async () => {
    const u = await crearUsuario(pool);
    await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    const viejo = ctx.correo.codigoPara(nuevo);

    const pronto = await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    assert.equal(pronto.status, 429);
    assert.ok(pronto.body.espera_segundos > 0);

    await envejecerCodigos(pool, u.id);
    assert.equal((await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE })).status, 200);
    const reciente = ctx.correo.codigoPara(nuevo);
    if (reciente !== viejo) assert.equal((await post('/correo/confirmar', u, { codigo: viejo })).status, 400);
    assert.equal((await post('/correo/confirmar', u, { codigo: reciente })).status, 200);
  });

  test('si el correo no se puede enviar no queda un código vigente', async () => {
    const u = await crearUsuario(pool);
    ctx.correo.falla = true;
    const r = await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    assert.equal(r.status, 502);
    assert.equal((await get('/perfil', u)).body.cambio_correo_pendiente, null);
  });

  test('si otro toma el correo antes de confirmar, responde 409 y no cambia nada', async () => {
    const u = await crearUsuario(pool);
    await post('/correo/solicitar', u, { correo_nuevo: nuevo, clave: CLAVE });
    const codigo = ctx.correo.codigoPara(nuevo);
    await crearUsuario(pool, { correo: nuevo });
    assert.equal((await post('/correo/confirmar', u, { codigo })).status, 409);
    assert.equal((await fila(u.id)).correo, u.correo);
  });

  test('el código de un usuario no sirve en la cuenta de otro', async () => {
    const a = await crearUsuario(pool);
    const b = await crearUsuario(pool);
    await post('/correo/solicitar', a, { correo_nuevo: nuevo, clave: CLAVE });
    const r = await post('/correo/confirmar', b, { codigo: ctx.correo.codigoPara(nuevo) });
    assert.equal(r.status, 400);
  });
});

describe('HU-32 · notificaciones', () => {
  test('sin cambios devuelve los valores por defecto del mockup', async () => {
    const u = await crearUsuario(pool);
    const r = (await get('/notificaciones', u)).body;
    assert.deepEqual(r.eventos, { reservas: true, reportes: true, mensajes: true, promociones: false });
    assert.deepEqual(r.canales, { push: true, correo: true, sms: false });
  });

  test('guarda cambios parciales de eventos y de canales, y los conserva', async () => {
    const u = await crearUsuario(pool);
    const r = await put('/notificaciones', u, { eventos: { promociones: true, mensajes: false }, canales: { sms: true } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.eventos, { reservas: true, reportes: true, mensajes: false, promociones: true });
    assert.deepEqual(r.body.canales, { push: true, correo: true, sms: true });

    await put('/notificaciones', u, { canales: { correo: false } });
    const otra = (await get('/notificaciones', u)).body;
    assert.equal(otra.eventos.promociones, true, 'lo anterior se conserva');
    assert.deepEqual(otra.canales, { push: true, correo: false, sms: true });
  });

  test('cada usuario tiene las suyas', async () => {
    const a = await crearUsuario(pool);
    const b = await crearUsuario(pool);
    await put('/notificaciones', a, { eventos: { mensajes: false } });
    assert.equal((await get('/notificaciones', b)).body.eventos.mensajes, true);
  });

  test('rechaza eventos o canales que no existen y valores que no son sí/no', async () => {
    const u = await crearUsuario(pool);
    assert.equal((await put('/notificaciones', u, { eventos: { spam: true } })).status, 400);
    assert.equal((await put('/notificaciones', u, { canales: { fax: true } })).status, 400);
    assert.equal((await put('/notificaciones', u, { eventos: { reservas: 'sí' } })).status, 400);
    assert.equal((await put('/notificaciones', u, {})).status, 400);
  });

  test('canalesActivos: evento activo por los canales activos; evento apagado, ninguno', async () => {
    const u = await crearUsuario(pool);
    await put('/notificaciones', u, { canales: { push: false, sms: true }, eventos: { promociones: false } });
    assert.deepEqual(await ctx.servicios.notificaciones.canalesActivos(u.id, 'reportes'), ['correo', 'sms']);
    assert.deepEqual(await ctx.servicios.notificaciones.canalesActivos(u.id, 'promociones'), []);
  });
});

describe('HU-35 · idioma, país y moneda', () => {
  test('lista idiomas, países y monedas disponibles sin necesidad de sesión', async () => {
    const r = await api().get('/api/cuenta/regiones');
    assert.equal(r.status, 200);
    assert.ok(r.body.paises.some((p) => p.codigo === 'CO' && p.moneda === 'COP'));
    assert.ok(r.body.monedas.some((m) => m.codigo === 'COP' && m.nombre === 'Peso colombiano'));
    assert.deepEqual(r.body.idiomas.map((i) => i.codigo), ['es', 'en', 'pt']);
  });

  test('al cambiar de país toma la moneda de ese país', async () => {
    const u = await crearUsuario(pool);
    const r = await patch('/region', u, { pais: 'MX' });
    assert.deepEqual([r.body.pais, r.body.moneda], ['MX', 'MXN']);
    assert.deepEqual([(await fila(u.id)).pais, (await fila(u.id)).moneda], ['MX', 'MXN']);
  });

  test('el usuario puede elegir otra moneda y otro idioma, solos o junto con el país', async () => {
    const u = await crearUsuario(pool);
    assert.equal((await patch('/region', u, { moneda: 'USD' })).body.moneda, 'USD');
    assert.equal((await patch('/region', u, { idioma: 'pt' })).body.idioma, 'pt');
    const r = await patch('/region', u, { pais: 'PE', moneda: 'USD' });
    assert.deepEqual([r.body.pais, r.body.moneda, r.body.idioma], ['PE', 'USD', 'pt']);
  });

  test('rechaza idiomas, países, monedas desconocidos y peticiones vacías', async () => {
    const u = await crearUsuario(pool);
    assert.equal((await patch('/region', u, { pais: 'ZZ' })).status, 400);
    assert.equal((await patch('/region', u, { moneda: 'XYZ' })).status, 400);
    assert.equal((await patch('/region', u, { idioma: 'fr' })).status, 400);
    assert.equal((await patch('/region', u, {})).status, 400);
  });
});

describe('HU-33 · reseñas', () => {
  let viajero;
  let cuidador;
  const reservas = new Map();

  beforeEach(async () => {
    viajero = await crearUsuario(pool);
    cuidador = await crearUsuario(pool, { rol: 'cuidador' });
    reservas.clear();
    reservas.set(10, { id: 10, viajeroId: viajero.id, cuidadorId: cuidador.id, estado: 'completada' });
    reservas.set(11, { id: 11, viajeroId: viajero.id, cuidadorId: cuidador.id, estado: 'en_curso' });
    reservas.set(12, { id: 12, viajeroId: '999', cuidadorId: cuidador.id, estado: 'completada' });
    ctx.integraciones.registrarReservas({ obtener: async (id) => reservas.get(Number(id)) ?? null });
  });

  test('califica una reserva completada', async () => {
    const r = await post('/resenas', viajero, { reserva_id: 10, calificacion: 5, comentario: '  Cuidó muy bien a Luna  ' });
    assert.equal(r.status, 201);
    assert.equal(r.body.comentario, 'Cuidó muy bien a Luna');
    assert.equal(String(r.body.cuidador_id), String(cuidador.id));

    const mias = (await get('/resenas', viajero)).body.resenas;
    assert.equal(mias.length, 1);
    assert.equal(mias[0].cuidador_nombre, cuidador.nombre);
  });

  test('solo si la reserva se completó', async () => {
    const r = await post('/resenas', viajero, { reserva_id: 11, calificacion: 4 });
    assert.equal(r.status, 409);
  });

  test('no se puede calificar una reserva ajena ni una que no existe', async () => {
    assert.equal((await post('/resenas', viajero, { reserva_id: 12, calificacion: 1 })).status, 404);
    assert.equal((await post('/resenas', viajero, { reserva_id: 999, calificacion: 1 })).status, 404);
  });

  test('una sola reseña por reserva', async () => {
    await post('/resenas', viajero, { reserva_id: 10, calificacion: 5 });
    assert.equal((await post('/resenas', viajero, { reserva_id: 10, calificacion: 1 })).status, 409);
  });

  test('valida la calificación y el largo del comentario', async () => {
    for (const calificacion of [0, 6, 3.5, '5', undefined]) {
      assert.equal((await post('/resenas', viajero, { reserva_id: 10, calificacion })).status, 400, String(calificacion));
    }
    assert.equal((await post('/resenas', viajero, { reserva_id: 10, calificacion: 5, comentario: 'x'.repeat(1001) })).status, 400);
  });

  test('el comentario es opcional', async () => {
    const r = await post('/resenas', viajero, { reserva_id: 10, calificacion: 3 });
    assert.equal(r.status, 201);
    assert.equal(r.body.comentario, null);
  });

  test('estado de la reserva para pintar el formulario', async () => {
    const a = await get('/resenas/reserva/10', viajero);
    assert.equal(a.body.puede_calificar, true);
    assert.equal(a.body.cuidador.nombre, cuidador.nombre);

    const b = await get('/resenas/reserva/11', viajero);
    assert.equal(b.body.puede_calificar, false);
    assert.match(b.body.motivo, /termine/);

    await post('/resenas', viajero, { reserva_id: 10, calificacion: 5 });
    const c = await get('/resenas/reserva/10', viajero);
    assert.equal(c.body.puede_calificar, false);
    assert.equal(c.body.resena.calificacion, 5);
  });

  test('sin módulo de reservas conectado responde 503 con un mensaje claro', async () => {
    await limpiar(pool);
    ctx = await montarApp(pool);
    const u = await crearUsuario(pool);
    const r = await post('/resenas', u, { reserva_id: 1, calificacion: 5 });
    assert.equal(r.status, 503);
    assert.match(r.body.error, /reservas/);
  });
});

describe('HU-37 y HU-39 · desactivar la cuenta', () => {
  const datos = { clave: CLAVE, motivo: 'ya_no_uso', detalle: 'Me mudo de ciudad' };

  test('sin pendientes se puede cerrar', async () => {
    const u = await crearUsuario(pool);
    const r = await get('/cierre/pendientes', u);
    assert.equal(r.body.puede_cerrar, true);
    assert.deepEqual(r.body.pendientes, []);
    // El checklist "Antes de irte" trae las 4 verificaciones de RN-4, todas en 0.
    assert.deepEqual(r.body.verificaciones.map((v) => [v.codigo, v.cantidad]),
      [['reservas_activas', 0], ['pagos_pendientes', 0], ['disputas_abiertas', 0], ['saldo_sin_liquidar', 0]]);
  });

  test('lista cuáles pendientes impiden cerrar y bloquea la desactivación (RN-4)', async () => {
    const u = await crearUsuario(pool);
    ctx.integraciones.registrarVerificacionPazYSalvo('reservas_activas', async ({ usuarioId }) => (String(usuarioId) === String(u.id) ? 2 : 0));
    ctx.integraciones.registrarVerificacionPazYSalvo('saldo_sin_liquidar', async () => ({ cantidad: 1, detalle: 'COP 120.000' }));

    const p = await get('/cierre/pendientes', u);
    assert.equal(p.body.puede_cerrar, false);
    assert.deepEqual(p.body.pendientes.map((x) => x.codigo), ['reservas_activas', 'saldo_sin_liquidar']);
    assert.equal(p.body.pendientes[0].titulo, 'Reservas activas');

    const r = await post('/cierre/desactivar', u, datos);
    assert.equal(r.status, 409);
    assert.equal(r.body.pendientes.length, 2);
    assert.equal((await fila(u.id)).status, true, 'no se desactivó');
  });

  test('pide la contraseña', async () => {
    const u = await crearUsuario(pool);
    assert.equal((await post('/cierre/desactivar', u, { ...datos, clave: 'Incorrecta1' })).status, 403);
    assert.equal((await fila(u.id)).status, true);
  });

  test('exige un motivo de la lista', async () => {
    const u = await crearUsuario(pool);
    assert.equal((await post('/cierre/desactivar', u, { clave: CLAVE })).status, 400);
    assert.equal((await post('/cierre/desactivar', u, { clave: CLAVE, motivo: 'porque sí' })).status, 400);
  });

  test('desactiva: status = false, guarda fecha y motivo, conserva todos los datos y cierra la sesión (RN-5)', async () => {
    const u = await crearUsuario(pool);
    await patch('/perfil', u, { telefono: '3001234567' });
    let sesionesCerradas = null;
    ctx.integraciones.registrarCierreDeSesiones(async (id) => { sesionesCerradas = id; });

    const r = await post('/cierre/desactivar', u, datos);
    assert.equal(r.status, 200);

    const f = await fila(u.id);
    assert.equal(f.status, false);
    assert.equal(f.motivo_desactivacion, 'ya_no_uso');
    assert.ok(f.desactivado_en);
    assert.equal(f.nombre, u.nombre, 'la fila y sus datos siguen ahí');
    assert.equal(f.telefono, '3001234567');
    assert.equal(sesionesCerradas, u.id);

    const { rows: [e] } = await pool.query('SELECT * FROM cuenta_eventos WHERE usuario_id = $1', [u.id]);
    assert.deepEqual([e.evento, e.origen, e.motivo, e.detalle], ['desactivada', 'usuario', 'ya_no_uso', 'Me mudo de ciudad']);

    assert.equal((await get('/perfil', u)).status, 401, 'el token de la cuenta ya no entra');
    assert.equal((await post('/cierre/desactivar', u, datos)).status, 401);
    assert.equal(ctx.correo.para(u.correo).length, 1, 'aviso de desactivación');
  });

  test('si el módulo de sesiones falla, la cuenta igual queda desactivada', async () => {
    const u = await crearUsuario(pool);
    ctx.integraciones.registrarCierreDeSesiones(async () => { throw new Error('sesiones caído'); });
    assert.equal((await post('/cierre/desactivar', u, datos)).status, 200);
    assert.equal((await fila(u.id)).status, false);
  });

  test('la base impide borrar usuarios (RN-5)', async () => {
    const u = await crearUsuario(pool);
    await assert.rejects(pool.query('DELETE FROM usuarios WHERE id = $1', [u.id]), /RN-5/);
    assert.ok(await fila(u.id));
  });

  test('el único administrador no puede desactivarse', async () => {
    const admin = await crearUsuario(pool, { rol: 'admin' });
    const r = await post('/cierre/desactivar', admin, datos);
    assert.equal(r.status, 409);
    assert.match(r.body.error, /único administrador/);

    const otro = await crearUsuario(pool, { rol: 'admin' });
    assert.equal((await post('/cierre/desactivar', admin, datos)).status, 200);
    assert.equal((await fila(otro.id)).status, true);
  });
});

describe('HU-40 · reactivar la cuenta', () => {
  const desactivar = (u) => post('/cierre/desactivar', u, { clave: CLAVE, motivo: 'privacidad' });

  test('responde igual exista o no la cuenta y solo envía código a una desactivada', async () => {
    const activa = await crearUsuario(pool);
    const inactiva = await crearUsuario(pool);
    await desactivar(inactiva);
    ctx.correo.enviados.length = 0;

    const respuestas = [];
    for (const correo of ['no-existe@correo.com', activa.correo, inactiva.correo]) {
      const r = await api().post('/api/cuenta/reactivacion/solicitar').send({ correo });
      assert.equal(r.status, 200);
      respuestas.push(r.body);
    }
    assert.deepEqual(respuestas[0], respuestas[1]);
    assert.deepEqual(respuestas[1], respuestas[2]);
    assert.equal(ctx.correo.enviados.length, 1);
    assert.equal(ctx.correo.enviados[0].para, inactiva.correo);
  });

  test('con el código vuelve a status = true, se guarda en el historial y los datos siguen iguales', async () => {
    const u = await crearUsuario(pool);
    await desactivar(u);
    await api().post('/api/cuenta/reactivacion/solicitar').send({ correo: u.correo });

    const r = await api().post('/api/cuenta/reactivacion/confirmar').send({ correo: u.correo, codigo: ctx.correo.codigoPara(u.correo) });
    assert.equal(r.status, 200);
    assert.equal(r.body.requiere_renovar_antecedentes, false);

    const f = await fila(u.id);
    assert.equal(f.status, true);
    assert.equal(f.desactivado_en, null);
    assert.equal(f.motivo_desactivacion, null);
    assert.equal(f.nombre, u.nombre);

    const { rows } = await pool.query('SELECT evento, origen FROM cuenta_eventos WHERE usuario_id = $1 ORDER BY id', [u.id]);
    assert.deepEqual(rows.map((e) => e.evento), ['desactivada', 'reactivada']);
    assert.equal((await get('/perfil', u)).status, 200, 'su token vuelve a funcionar');
  });

  test('un código incorrecto, vencido o de otra cuenta falla con el mismo mensaje', async () => {
    const u = await crearUsuario(pool);
    await desactivar(u);
    await api().post('/api/cuenta/reactivacion/solicitar').send({ correo: u.correo });
    const bueno = ctx.correo.codigoPara(u.correo);
    const malo = bueno === '000000' ? '111111' : '000000';

    const mensajes = new Set();
    for (const cuerpo of [{ correo: u.correo, codigo: malo }, { correo: 'nadie@correo.com', codigo: bueno }]) {
      const r = await api().post('/api/cuenta/reactivacion/confirmar').send(cuerpo);
      assert.equal(r.status, 400);
      mensajes.add(r.body.error);
    }
    assert.equal(mensajes.size, 1);
    assert.equal((await fila(u.id)).status, false);
  });

  test('máximo 5 intentos también aquí', async () => {
    const u = await crearUsuario(pool);
    await desactivar(u);
    await api().post('/api/cuenta/reactivacion/solicitar').send({ correo: u.correo });
    const bueno = ctx.correo.codigoPara(u.correo);
    const malo = bueno === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await api().post('/api/cuenta/reactivacion/confirmar').send({ correo: u.correo, codigo: malo });
    const r = await api().post('/api/cuenta/reactivacion/confirmar').send({ correo: u.correo, codigo: bueno });
    assert.equal(r.status, 400);
    assert.equal((await fila(u.id)).status, false);
  });

  test('una cuenta suspendida por un administrador NO se puede reactivar sola', async () => {
    const admin = await crearUsuario(pool, { rol: 'admin' });
    const cuidador = await crearUsuario(pool, { rol: 'cuidador' });
    await ctx.servicios.cierre.suspender({ usuarioId: cuidador.id, adminId: admin.id, detalle: 'Reporte grave' });
    assert.equal((await fila(cuidador.id)).status, false);

    ctx.correo.enviados.length = 0;
    const s = await api().post('/api/cuenta/reactivacion/solicitar').send({ correo: cuidador.correo });
    assert.equal(s.status, 200);
    assert.equal(ctx.correo.enviados.length, 0, 'no se envía ningún código');

    // Aunque alguien fabricara un código, la confirmación tampoco la reactiva.
    const c = await api().post('/api/cuenta/reactivacion/confirmar').send({ correo: cuidador.correo, codigo: '123456' });
    assert.equal(c.status, 400);
    assert.equal((await fila(cuidador.id)).status, false);
  });

  test('un cuidador con antecedentes vencidos se reactiva pero queda avisado', async () => {
    const c = await crearUsuario(pool, { rol: 'cuidador' });
    ctx.integraciones.registrarAntecedentes(async () => false);
    await desactivar(c);
    await api().post('/api/cuenta/reactivacion/solicitar').send({ correo: c.correo });
    const r = await api().post('/api/cuenta/reactivacion/confirmar').send({ correo: c.correo, codigo: ctx.correo.codigoPara(c.correo) });
    assert.equal(r.status, 200);
    assert.equal(r.body.requiere_renovar_antecedentes, true);
    assert.equal((await fila(c.id)).status, true);
  });

  test('puede desactivarse y reactivarse varias veces, y el historial cuenta cada ciclo', async () => {
    const u = await crearUsuario(pool);
    for (let i = 0; i < 2; i++) {
      assert.equal((await desactivar(u)).status, 200);
      await pool.query("UPDATE cuenta_codigos SET creado_en = NOW() - INTERVAL '2 minutes' WHERE usuario_id = $1", [u.id]);
      await api().post('/api/cuenta/reactivacion/solicitar').send({ correo: u.correo });
      await api().post('/api/cuenta/reactivacion/confirmar').send({ correo: u.correo, codigo: ctx.correo.codigoPara(u.correo) });
    }
    const { rows: [h] } = await pool.query('SELECT * FROM v_historial_cuentas WHERE usuario_id = $1', [u.id]);
    assert.deepEqual([Number(h.desactivaciones), Number(h.reactivaciones), h.status], [2, 2, true]);
  });
});

describe('HU-41 · historial de cuentas desactivadas', () => {
  let admin;
  let viajero;
  let cuidador;

  beforeEach(async () => {
    admin = await crearUsuario(pool, { rol: 'admin' });
    viajero = await crearUsuario(pool, { nombre: 'Persona Privada', telefono: '3001112233' });
    cuidador = await crearUsuario(pool, { rol: 'cuidador' });
    await post('/cierre/desactivar', viajero, { clave: CLAVE, motivo: 'privacidad', detalle: 'No quiero seguir' });
    await ctx.servicios.cierre.suspender({ usuarioId: cuidador.id, adminId: admin.id, detalle: 'Reporte grave' });
  });

  test('solo los administradores lo ven', async () => {
    const otro = await crearUsuario(pool);
    assert.equal((await get('/admin/cuentas', otro)).status, 403);
    assert.equal((await get('/admin/cuentas', admin)).status, 200);
    assert.equal((await api().get('/api/cuenta/admin/cuentas')).status, 401);
  });

  test('lista las cuentas desactivadas SIN datos personales', async () => {
    const r = await get('/admin/cuentas', admin);
    assert.equal(r.body.total, 2);
    assert.deepEqual(r.body.resumen, { desactivadas: 2, reactivadas: 0 });

    const texto = JSON.stringify(r.body);
    for (const privado of [viajero.nombre, viajero.correo, cuidador.correo, '3001112233', 'clave_hash']) {
      assert.ok(!texto.includes(privado), `no debe aparecer: ${privado}`);
    }
    for (const c of r.body.cuentas) {
      assert.deepEqual(Object.keys(c).sort(), ['creado_en', 'desactivaciones', 'desactivado_en', 'motivo', 'pais', 'reactivaciones', 'rol', 'status', 'usuario_id']);
    }
  });

  test('filtra y pagina', async () => {
    const soloCuidadores = await get('/admin/cuentas?rol=cuidador', admin);
    assert.equal(soloCuidadores.body.total, 1);
    assert.equal(soloCuidadores.body.cuentas[0].motivo, 'suspension');

    const pagina = await get('/admin/cuentas?tamano=1&pagina=2', admin);
    assert.equal(pagina.body.cuentas.length, 1);
    assert.equal(pagina.body.total, 2);
    assert.equal((await get('/admin/cuentas?tamano=500', admin)).status, 400);
  });

  test('el historial de una cuenta distingue lo que hizo el usuario de la suspensión', async () => {
    const a = await get(`/admin/cuentas/${viajero.id}/historial`, admin);
    assert.deepEqual(a.body.eventos.map((e) => [e.evento, e.origen]), [['desactivada', 'usuario']]);
    const b = await get(`/admin/cuentas/${cuidador.id}/historial`, admin);
    assert.deepEqual(b.body.eventos.map((e) => [e.evento, e.origen]), [['desactivada', 'admin']]);
    assert.equal((await get(`/admin/cuentas/${admin.id}/historial`, admin)).status, 404);
  });

  test('las reseñas de una cuenta desactivada siguen en los reportes', async () => {
    const otro = await crearUsuario(pool, { rol: 'cuidador' });
    const autor = await crearUsuario(pool);
    await pool.query('INSERT INTO resenas (reserva_id, autor_id, cuidador_id, calificacion) VALUES (1, $1, $2, 5)', [autor.id, otro.id]);
    await ctx.servicios.cierre.suspender({ usuarioId: otro.id, adminId: admin.id });
    const { rows } = await pool.query(
      `SELECT r.calificacion, h.rol, h.status FROM resenas r JOIN v_historial_cuentas h ON h.usuario_id = r.cuidador_id`,
    );
    assert.deepEqual(rows, [{ calificacion: 5, rol: 'cuidador', status: false }]);
  });
});
