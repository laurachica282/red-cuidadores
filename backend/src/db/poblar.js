// Llena la base con datos de demostración realistas: cuidadores verificados con ubicación y servicios,
// viajeros con mascotas, reservas en todos los estados, reseñas, reportes con notas y mensajes.
// Usa la misma conexión que el backend (DATABASE_URL para Supabase/Render, o DB_* para local).
//
//   npm run db:poblar                                    60 cuidadores y 150 viajeros
//   npm run db:poblar -- --cuidadores=100 --viajeros=300
//   npm run db:poblar -- --semilla=7                     otros datos (misma semilla = mismos datos)
//
// Se puede correr varias veces: cada corrida agrega gente nueva (los usuarios no se borran, RN-5).
// Todas las cuentas: correo @demo.redcuidadores.co y contraseña Demo2026.
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const DOMINIO = 'demo.redcuidadores.co';
const CLAVE = 'Demo2026';

const arg = (nombre, defecto) => {
  const a = process.argv.find((x) => x.startsWith(`--${nombre}=`));
  const n = a ? Number(a.split('=')[1]) : defecto;
  return Number.isInteger(n) && n >= 0 ? n : defecto;
};
const CANT_CUIDADORES = arg('cuidadores', 60);
const CANT_VIAJEROS = arg('viajeros', 150);
const SEMILLA = arg('semilla', 2026);

/* ───────────── Azar reproducible ───────────── */
let estadoAzar = SEMILLA;
const azar = () => {
  estadoAzar = (estadoAzar + 0x6d2b79f5) | 0;
  let t = Math.imul(estadoAzar ^ (estadoAzar >>> 15), 1 | estadoAzar);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const uno = (lista) => lista[Math.floor(azar() * lista.length)];
const prob = (p) => azar() < p;
// Elige según pesos: [[valor, peso], ...]
const pesado = (opciones) => {
  let r = azar() * opciones.reduce((s, [, p]) => s + p, 0);
  for (const [v, p] of opciones) { r -= p; if (r <= 0) return v; }
  return opciones.at(-1)[0];
};
const varios = (lista, n) => [...lista].sort(() => azar() - 0.5).slice(0, n);

/* ───────────── Fechas (día local) ───────────── */
const DIA = 86400000;
const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
const dia = (offset) => new Date(hoy.getTime() + offset * DIA).toISOString().slice(0, 10);
const momento = (offsetDias, hora = entre(7, 21), minuto = entre(0, 59)) => {
  const d = new Date(hoy.getTime() + offsetDias * DIA); d.setHours(hora, minuto, 0, 0); return d;
};

/* ───────────── Catálogos ───────────── */
const NOMBRES_F = ['Valentina', 'Camila', 'Sofía', 'Isabella', 'Mariana', 'Daniela', 'Laura', 'Gabriela', 'Natalia', 'Paula', 'Andrea', 'Carolina', 'Juliana', 'Manuela', 'Sara', 'Lucía', 'Ana', 'María José', 'Catalina', 'Alejandra'];
const NOMBRES_M = ['Santiago', 'Mateo', 'Sebastián', 'Samuel', 'Nicolás', 'Alejandro', 'Daniel', 'Felipe', 'Juan Pablo', 'Andrés', 'David', 'Julián', 'Tomás', 'Diego', 'Carlos', 'Miguel', 'Esteban', 'Simón', 'Martín', 'Gabriel'];
const APELLIDOS = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Díaz', 'Vargas', 'Rojas', 'Moreno', 'Herrera', 'Castro', 'Jiménez', 'Ruiz', 'Gómez', 'Ortiz', 'Mendoza', 'Silva', 'Ríos', 'Cárdenas', 'Rincón', 'Salazar', 'Navarro', 'Cruz', 'Peña', 'Restrepo', 'Valencia'];

// País → ciudades → barrios con coordenadas aproximadas.
const PAISES = {
  CO: { peso: 70, idioma: 'es', moneda: 'COP', tel: '+57 3', factor: 1, redondeo: 1000, ciudades: {
    'Bogotá': [['Chapinero', 4.6486, -74.0636], ['Usaquén', 4.6951, -74.0312], ['Teusaquillo', 4.637, -74.076], ['Cedritos', 4.722, -74.038], ['Suba', 4.741, -74.083], ['El Chicó', 4.6715, -74.0505], ['Modelia', 4.668, -74.115], ['La Candelaria', 4.597, -74.073]],
    'Medellín': [['El Poblado', 6.2088, -75.568], ['Laureles', 6.245, -75.596], ['Envigado', 6.17, -75.585], ['Belén', 6.231, -75.604]],
    'Cali': [['San Fernando', 3.43, -76.54], ['Granada', 3.459, -76.533], ['Ciudad Jardín', 3.37, -76.532]],
    'Barranquilla': [['El Prado', 10.993, -74.8], ['Riomar', 11.015, -74.825]],
  } },
  MX: { peso: 15, idioma: 'es', moneda: 'MXN', tel: '+52 55', factor: 0.0045, redondeo: 10, ciudades: {
    'Ciudad de México': [['Roma Norte', 19.418, -99.162], ['Condesa', 19.411, -99.173], ['Coyoacán', 19.35, -99.162]],
    'Guadalajara': [['Providencia', 20.693, -103.388], ['Chapalita', 20.668, -103.398]],
  } },
  BR: { peso: 8, idioma: 'pt', moneda: 'BRL', tel: '+55 11', factor: 0.0013, redondeo: 5, ciudades: {
    'São Paulo': [['Pinheiros', -23.567, -46.692], ['Vila Mariana', -23.589, -46.634], ['Moema', -23.601, -46.665]],
  } },
  US: { peso: 7, idioma: 'en', moneda: 'USD', tel: '+1 305', factor: 0.00025, redondeo: 1, ciudades: {
    'Miami': [['Brickell', 25.76, -80.193], ['Coral Gables', 25.721, -80.268], ['Wynwood', 25.801, -80.199]],
  } },
};

// Tarifas base en COP; se convierten a la moneda del país.
const TARIFAS = { alojamiento: [45000, 150000], domicilio: [25000, 50000], paseo: [15000, 30000], guarderia: [25000, 45000] };
const precio = (pais, cop) => {
  const p = PAISES[pais];
  return Math.max(p.redondeo, Math.round((cop * p.factor) / p.redondeo) * p.redondeo);
};

const DESCRIPCIONES = [
  'Vivo en una casa con patio y trabajo desde casa, así que tu mascota nunca está sola.',
  'Apartamento tranquilo cerca de un parque grande. Paseos dos veces al día.',
  'Tengo experiencia con perros grandes y mascotas mayores. Doy medicamentos sin problema.',
  'Amante de los gatos: espacio seguro, mallas en las ventanas y mucho juego.',
  'Estudiante de veterinaria. Te envío fotos y reportes varias veces al día.',
  'Casa campestre a 20 minutos de la ciudad, con zona verde cerrada.',
  'He cuidado mascotas por más de 5 años. Tengo un perro muy sociable que les hace compañía.',
  'Paseador certificado. Ideal para perros con mucha energía.',
];
const MASCOTAS = {
  perro: { peso: 60, razas: ['Criollo', 'Labrador', 'Golden Retriever', 'Beagle', 'Bulldog Francés', 'Pastor Alemán', 'Schnauzer', 'Pug', 'Border Collie', 'French Poodle', 'Shih Tzu'], kg: [3, 35] },
  gato: { peso: 30, razas: ['Doméstico', 'Siamés', 'Persa', 'Angora', 'Bengalí', 'Maine Coon'], kg: [2, 7] },
  ave: { peso: 4, razas: ['Periquito', 'Canario', 'Cacatúa'], kg: [0.1, 0.8] },
  conejo: { peso: 4, razas: ['Belier', 'Holandés', 'Cabeza de león'], kg: [1, 4] },
  otro: { peso: 2, razas: ['Hámster', 'Cobayo', 'Tortuga'], kg: [0.1, 2] },
};
const NOMBRES_MASCOTA = ['Luna', 'Toby', 'Max', 'Rocky', 'Lola', 'Kira', 'Simba', 'Nala', 'Milo', 'Coco', 'Bruno', 'Canela', 'Lucas', 'Mía', 'Thor', 'Zeus', 'Frida', 'Oliver', 'Chispa', 'Manchas', 'Pelusa', 'Tom', 'Michi', 'Princesa', 'Copito', 'Rex', 'Bella', 'Duque', 'Paco', 'Lulú'];
const INDICACIONES = ['Come dos veces al día.', 'Alérgico al pollo.', 'Toma medicamento para la tiroides en la mañana.', 'Le dan miedo los truenos.', 'No darle chocolate ni uvas.', 'Necesita su cobija para dormir.', null, null];
const VACUNAS = ['Rabia, parvovirus, moquillo', 'Rabia, triple felina', 'Rabia, parvovirus', 'Al día según carnet', null];

const REPORTES = [
  ['Desayuno', 'Se comió todo y salió feliz a su primer paseo.'], ['Paseo en el parque', '30 minutos jugando con otros perros. Muy tranquilo.'],
  ['Siesta', 'Descansando en su cama, con agua fresca cerca.'], ['Hora de jugar', 'Estuvimos con la pelota un buen rato.'],
  ['Cena', 'Comió bien y tomó agua.'], ['Antes de dormir', 'Ya está acomodado y tranquilo.'],
  ['Medicamento', 'Le di su medicamento a la hora indicada.'], ['Baño', 'Quedó limpio y oliendo rico.'],
];
const MENSAJES = [
  ['Hola, ¿cómo va todo?', '¡Todo muy bien! Ya se adaptó a la casa.'],
  ['¿Comió bien hoy?', 'Sí, se comió todo. Te subo fotos en un rato.'],
  ['Gracias por los reportes, me dejan muy tranquila.', '¡Con gusto! Es un amor.'],
  ['¿A qué hora paso a recogerlo?', 'Cuando quieras después de las 10 a. m.'],
  ['Recuerda que no puede comer pollo.', 'Anotado, no te preocupes.'],
];
const RESENAS = {
  5: ['Excelente cuidador, mi mascota volvió feliz.', 'Súper recomendado: reportes diarios y mucho cariño.', 'Lo mejor que pudimos encontrar. Volveremos.'],
  4: ['Muy buen servicio, solo tardó un poco en responder.', 'Todo bien, mi perro estuvo cómodo.'],
  3: ['Cumplió, aunque esperaba más reportes.', 'Bien en general.'],
  2: ['Hubo poca comunicación durante el servicio.'],
  1: ['No quedé satisfecho con el cuidado.'],
};
const MOTIVOS_RECHAZO = ['No tengo disponibilidad en esas fechas.', 'Ya tengo otra mascota a cargo esos días.', 'Estaré de viaje.'];

/* ───────────── Inserción por lotes ───────────── */
async function insertar(db, tabla, columnas, filas, devolver = 'id') {
  const salida = [];
  const lote = Math.max(1, Math.floor(30000 / columnas.length));
  for (let i = 0; i < filas.length; i += lote) {
    const parte = filas.slice(i, i + lote);
    const valores = [];
    const marcas = parte.map((f, j) =>
      `(${columnas.map((c, k) => { valores.push(f[c]); return `$${j * columnas.length + k + 1}`; }).join(', ')})`);
    const r = await db.query(
      `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES ${marcas.join(', ')}${devolver ? ` RETURNING ${devolver}` : ''}`,
      valores
    );
    salida.push(...r.rows);
  }
  return salida;
}

function persona(pais, n, rol) {
  const mujer = prob(0.5);
  const nombre = `${uno(mujer ? NOMBRES_F : NOMBRES_M)} ${uno(APELLIDOS)} ${uno(APELLIDOS)}`;
  const base = nombre.split(' ').slice(0, 2).join('.').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
  const ciudad = uno(Object.keys(PAISES[pais].ciudades));
  const p = PAISES[pais];
  return {
    nombre, correo: `${base}.${rol[0]}${n}@${DOMINIO}`, rol, ciudad, pais, idioma: p.idioma, moneda: p.moneda,
    telefono: `${p.tel}${entre(10, 99)} ${entre(100, 999)} ${entre(1000, 9999)}`,
    creado_en: momento(-entre(20, 720)),
  };
}
const paisAlAzar = () => pesado(Object.entries(PAISES).map(([k, v]) => [k, v.peso]));

async function main() {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const clave = await bcrypt.hash(CLAVE, 10);
    const previos = Number((await db.query(`SELECT COUNT(*) FROM usuarios WHERE correo LIKE '%@${DOMINIO}'`)).rows[0].count);

    // Admin de la demo (revisa las verificaciones)
    await db.query(
      `INSERT INTO usuarios (nombre, correo, clave_hash, rol, ciudad, pais, correo_verificado)
       VALUES ('Admin Demo', $1, $2, 'admin', 'Bogotá', 'CO', TRUE) ON CONFLICT (correo) DO NOTHING`,
      [`admin@${DOMINIO}`, clave]
    );
    const adminId = (await db.query('SELECT id FROM usuarios WHERE correo = $1', [`admin@${DOMINIO}`])).rows[0].id;

    /* Cuidadores */
    const datosCuidadores = Array.from({ length: CANT_CUIDADORES }, (_, i) => persona(paisAlAzar(), previos + i, 'cuidador'));
    const columnasUsuario = ['nombre', 'correo', 'clave_hash', 'rol', 'telefono', 'ciudad', 'pais', 'idioma', 'moneda', 'correo_verificado', 'dos_pasos', 'creado_en'];
    const ids = await insertar(db, 'usuarios', columnasUsuario,
      datosCuidadores.map((c) => ({ ...c, clave_hash: clave, correo_verificado: true, dos_pasos: false })));
    const cuidadores = datosCuidadores.map((c, i) => ({ ...c, id: ids[i].id }));

    const perfiles = [];
    const servicios = [];
    const verificaciones = [];
    for (const c of cuidadores) {
      const [barrio, lat, lng] = uno(PAISES[c.pais].ciudades[c.ciudad]);
      const tipos = pesado([[['perro'], 30], [['perro', 'gato'], 40], [['gato'], 15], [['perro', 'gato', 'conejo', 'ave', 'otro'], 15]]);
      const noche = precio(c.pais, entre(...TARIFAS.alojamiento));
      c.tipos = tipos;
      c.servicios = { alojamiento: noche };
      for (const s of ['domicilio', 'paseo', 'guarderia']) if (prob(0.6)) c.servicios[s] = precio(c.pais, entre(...TARIFAS[s]));
      perfiles.push({
        usuario_id: c.id, descripcion: uno(DESCRIPCIONES), tarifa_noche: noche, tipos_mascota: tipos,
        direccion: `Calle ${entre(1, 150)} # ${entre(1, 99)}-${entre(1, 99)}`, barrio,
        latitud: +(lat + (azar() - 0.5) * 0.02).toFixed(6), longitud: +(lng + (azar() - 0.5) * 0.02).toFixed(6),
      });
      for (const [servicio, tarifa] of Object.entries(c.servicios)) servicios.push({ usuario_id: c.id, servicio, tarifa });
      // 85 % aprobados y vigentes, 8 % en revisión, 7 % con la aprobación vencida (no salen en la búsqueda, RN-3).
      c.estado = pesado([['vigente', 85], ['revision', 8], ['vencido', 7]]);
      const revisado = c.estado === 'vencido' ? -entre(380, 460) : -entre(5, 300);
      verificaciones.push(c.estado === 'revision'
        ? { usuario_id: c.id, estado: 'en_revision', acepta_datos: true, revisado_por: null, revisado_en: null, vence_en: null, creado_en: momento(-entre(1, 6)) }
        : { usuario_id: c.id, estado: 'aprobado', acepta_datos: true, revisado_por: adminId, revisado_en: momento(revisado),
          vence_en: momento(revisado + 365), creado_en: momento(revisado - entre(1, 4)) });
    }
    await insertar(db, 'perfiles_cuidador', ['usuario_id', 'descripcion', 'tarifa_noche', 'tipos_mascota', 'direccion', 'barrio', 'latitud', 'longitud'], perfiles, '');
    await insertar(db, 'servicios_cuidador', ['usuario_id', 'servicio', 'tarifa'], servicios, '');
    await insertar(db, 'verificaciones_cuidador', ['usuario_id', 'estado', 'acepta_datos', 'revisado_por', 'revisado_en', 'vence_en', 'creado_en'], verificaciones, '');

    /* Viajeros y mascotas */
    const datosViajeros = Array.from({ length: CANT_VIAJEROS }, (_, i) => persona(paisAlAzar(), previos + i, 'viajero'));
    const idsV = await insertar(db, 'usuarios', columnasUsuario,
      datosViajeros.map((v) => ({ ...v, clave_hash: clave, correo_verificado: true, dos_pasos: false })));
    const viajeros = datosViajeros.map((v, i) => ({ ...v, id: idsV[i].id }));

    const filasMascotas = [];
    for (const v of viajeros) {
      for (const nombre of varios(NOMBRES_MASCOTA, pesado([[1, 60], [2, 30], [3, 10]]))) {
        const especie = pesado(Object.entries(MASCOTAS).map(([k, m]) => [k, m.peso]));
        const [min, max] = MASCOTAS[especie].kg;
        filasMascotas.push({
          usuario_id: v.id, nombre, especie, raza: uno(MASCOTAS[especie].razas), edad_meses: entre(3, 180),
          peso_kg: +(min + azar() * (max - min)).toFixed(1), vacunas: uno(VACUNAS),
          microchip: prob(0.5) ? String(entre(100000000, 999999999)) + String(entre(100000, 999999)) : null,
          indicaciones_medicas: uno(INDICACIONES),
        });
      }
    }
    const idsM = await insertar(db, 'mascotas', ['usuario_id', 'nombre', 'especie', 'raza', 'edad_meses', 'peso_kg', 'vacunas', 'microchip', 'indicaciones_medicas'], filasMascotas);
    const mascotas = filasMascotas.map((m, i) => ({ ...m, id: idsM[i].id }));
    const mascotasDe = new Map();
    for (const m of mascotas) mascotasDe.set(m.usuario_id, [...(mascotasDe.get(m.usuario_id) ?? []), m]);

    /* Reservas: ventanas seguidas por cuidador, así nunca se cruzan dos confirmadas (restricción de 15_reservas.sql). */
    const reservas = [];
    for (const c of cuidadores.filter((x) => x.estado === 'vigente')) {
      const clientes = viajeros.filter((v) => v.pais === c.pais);
      if (!clientes.length) continue;
      let inicio = -entre(90, 150);
      while (inicio < 60) {
        const v = uno(clientes);
        const m = uno(mascotasDe.get(v.id));
        const servicio = uno(Object.keys(c.servicios));
        const noches = servicio === 'alojamiento' ? entre(1, 6) : entre(0, 3);
        const fin = inicio + Math.max(noches, servicio === 'alojamiento' ? 1 : 0);
        const unidades = servicio === 'alojamiento' ? fin - inicio : fin - inicio + 1;
        let estado;
        if (fin < 0) estado = pesado([['completada', 75], ['cancelada', 10], ['rechazada', 10], ['vencida', 5]]);
        else if (inicio <= 0) estado = 'confirmada';
        else estado = pesado([['confirmada', 55], ['pendiente', 30], ['rechazada', 10], ['cancelada', 5]]);
        const creado = estado === 'pendiente' ? new Date(Date.now() - entre(1, 20) * 3600000) : momento(Math.min(inicio - entre(2, 20), 0));
        reservas.push({
          viajero_id: v.id, cuidador_id: c.id, mascota_id: m.id, servicio, fecha_inicio: dia(inicio), fecha_fin: dia(fin),
          tarifa: c.servicios[servicio], moneda: PAISES[c.pais].moneda, unidades, total: c.servicios[servicio] * unidades, estado,
          responder_antes: new Date(creado.getTime() + DIA),
          respondida_en: ['pendiente', 'vencida'].includes(estado) ? null : new Date(creado.getTime() + entre(1, 10) * 3600000),
          motivo_rechazo: estado === 'rechazada' ? uno(MOTIVOS_RECHAZO) : null,
          nota: prob(0.3) ? uno(['Es un poco tímido al principio.', 'Le encanta jugar con pelotas.', 'Por favor mandar fotos.']) : null,
          creado_en: creado, _ini: inicio, _fin: fin, _cuidador: c, _viajero: v, _mascota: m,
        });
        inicio = fin + entre(1, 10);
      }
    }
    const columnasReserva = ['viajero_id', 'cuidador_id', 'mascota_id', 'servicio', 'fecha_inicio', 'fecha_fin', 'tarifa', 'moneda', 'unidades', 'total', 'estado', 'responder_antes', 'respondida_en', 'motivo_rechazo', 'nota', 'creado_en'];
    const idsR = await insertar(db, 'reservas', columnasReserva, reservas);
    reservas.forEach((r, i) => { r.id = idsR[i].id; });

    /* Reseñas, reportes y mensajes */
    const resenas = [];
    const reportes = [];
    const mensajes = [];
    for (const r of reservas) {
      const servicioHecho = r.estado === 'completada' || (r.estado === 'confirmada' && r._ini <= 0);
      if (r.estado === 'completada' && prob(0.7)) {
        const calificacion = pesado([[5, 55], [4, 30], [3, 10], [2, 4], [1, 1]]);
        resenas.push({ reserva_id: r.id, autor_id: r.viajero_id, cuidador_id: r.cuidador_id, calificacion,
          comentario: uno(RESENAS[calificacion]), creado_en: momento(Math.min(r._fin + entre(1, 3), 0)) });
      }
      if (servicioHecho) {
        for (let d = r._ini; d <= Math.min(r._fin, 0); d++) {
          for (const [hora, [titulo, nota]] of varios(REPORTES, entre(1, 2)).map((x, k) => [k ? entre(15, 20) : entre(8, 12), x])) {
            const cuando = momento(d, hora);
            if (cuando < new Date()) reportes.push({ reserva_id: r.id, autor_id: r.cuidador_id, titulo, nota, creado_en: cuando });
          }
        }
      }
      if (r.estado !== 'vencida' && prob(servicioHecho ? 0.8 : 0.4)) {
        const [pregunta, respuesta] = uno(MENSAJES);
        const base = Math.min(r._ini, 0) - 1;
        mensajes.push({ reserva_id: r.id, autor_id: r.viajero_id, texto: pregunta, leido_en: momento(base, 12), creado_en: momento(base, 10) });
        mensajes.push({ reserva_id: r.id, autor_id: r.cuidador_id, texto: respuesta, leido_en: prob(0.7) ? momento(base, 14) : null, creado_en: momento(base, 11) });
      }
    }
    await insertar(db, 'resenas', ['reserva_id', 'autor_id', 'cuidador_id', 'calificacion', 'comentario', 'creado_en'], resenas, '');
    await insertar(db, 'reportes_servicio', ['reserva_id', 'autor_id', 'titulo', 'nota', 'creado_en'], reportes, '');
    await insertar(db, 'mensajes_reserva', ['reserva_id', 'autor_id', 'texto', 'leido_en', 'creado_en'], mensajes, '');

    await db.query('COMMIT');

    const porEstado = reservas.reduce((a, r) => ({ ...a, [r.estado]: (a[r.estado] ?? 0) + 1 }), {});
    const enCurso = reservas.find((r) => r.estado === 'confirmada' && r._ini <= 0 && r._fin >= 0);
    console.log(`\nListo (semilla ${SEMILLA}):`);
    console.log(`  ${cuidadores.length} cuidadores (${cuidadores.filter((c) => c.estado === 'vigente').length} visibles en la búsqueda)`);
    console.log(`  ${viajeros.length} viajeros con ${mascotas.length} mascotas`);
    console.log(`  ${reservas.length} reservas: ${Object.entries(porEstado).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    console.log(`  ${resenas.length} reseñas, ${reportes.length} reportes, ${mensajes.length} mensajes`);
    console.log(`\nContraseña de todas las cuentas: ${CLAVE}`);
    console.log(`  Admin:    admin@${DOMINIO}`);
    console.log(`  Cuidador: ${cuidadores.find((c) => c.estado === 'vigente')?.correo}`);
    if (enCurso) console.log(`  Viajero con una reserva en curso: ${enCurso._viajero.correo} (${enCurso._mascota.nombre} con ${enCurso._cuidador.nombre})`);
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('\nNo se cargó nada (se deshizo todo):', e.message);
    if (e.code === '28P01') console.error('La contraseña de la base no coincide.');
    if (e.code === 'ECONNREFUSED') console.error('La base no está encendida o la dirección es otra.');
    if (e.code === '42P01') console.error('Falta crear la estructura: corre primero esquema_completo.sql.');
    process.exitCode = 1;
  } finally {
    db.release();
    await pool.end();
  }
}

main();
