import { pool } from '../../db.js';
import { avisar, correoSoporte } from './avisos.js';

// Fecha de "hoy" para el servicio: la de la región (los servidores suelen estar en UTC y en
// Colombia, a las 7 p. m., UTC ya es mañana).
const ZONA = process.env.ZONA_HORARIA ?? 'America/Bogota';
const HOY = `(NOW() AT TIME ZONE '${ZONA.replaceAll("'", '')}')::date`;
const DIAS_CHAT_DESPUES = 7;
const MAX_MENSAJES = 200;
const TELEFONO = /^[+\d][\d\s()-]{6,24}$/;
// Correo sencillo: sin espacios, una sola @ y un punto en el dominio.
const esCorreo = (t) => !/\s/.test(t) && t.split('@').length === 2 && t.split('@').every(Boolean) && t.split('@')[1].includes('.');

export class ErrorSeguimiento extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Fase de la reserva para el seguimiento. "en_curso" se deduce de las fechas mientras no
// exista la entrega con código (HU-27), que es la que debería marcar el inicio real.
//   pendiente · inactiva (rechazada, vencida, cancelada) · proxima · en_curso · terminada
const FASE = `
  CASE
    WHEN r.estado = 'pendiente' THEN 'pendiente'
    WHEN r.estado IN ('rechazada', 'vencida', 'cancelada') THEN 'inactiva'
    WHEN r.estado = 'completada' OR ${HOY} > r.fecha_fin THEN 'terminada'
    WHEN ${HOY} < r.fecha_inicio THEN 'proxima'
    ELSE 'en_curso'
  END`;

// El chat existe desde la solicitud y se cierra 7 días después del servicio (HU-31).
const CHAT_ABIERTO = `(r.estado IN ('pendiente', 'confirmada', 'en_curso', 'completada')
                       AND ${HOY} <= r.fecha_fin + ${DIAS_CHAT_DESPUES})`;

const SELECCION = `
  SELECT r.id, r.servicio, r.estado, r.total, r.moneda, r.viajero_id, r.cuidador_id,
         r.fecha_inicio::text AS fecha_inicio, r.fecha_fin::text AS fecha_fin,
         (r.fecha_fin + ${DIAS_CHAT_DESPUES})::text AS chat_cierra,
         ${HOY}::text AS hoy, ${FASE} AS fase, ${CHAT_ABIERTO} AS chat_abierto,
         r.tarifa, r.unidades, r.nota, r.motivo_rechazo, r.creado_en, r.respondida_en, r.responder_antes,
         m.id AS mascota_id, m.nombre AS mascota, m.especie, m.raza, m.foto_url AS mascota_foto,
         m.edad_meses, m.peso_kg, m.vacunas, m.microchip, m.indicaciones_medicas, m.es_fina,
         uv.nombre AS viajero, uv.correo AS viajero_correo, uv.foto_url AS viajero_foto,
         uc.nombre AS cuidador, uc.foto_url AS cuidador_foto, uc.ciudad AS cuidador_ciudad,
         pc.barrio AS cuidador_barrio
    FROM reservas r
    JOIN mascotas m  ON m.id = r.mascota_id
    JOIN usuarios uv ON uv.id = r.viajero_id
    JOIN usuarios uc ON uc.id = r.cuidador_id
    LEFT JOIN perfiles_cuidador pc ON pc.usuario_id = r.cuidador_id`;

const DIA_MS = 24 * 60 * 60 * 1000;
const sumarDias = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS);
const fotoPerfil = (archivo) => (archivo ? `/cuenta/fotos/${archivo}` : null);

function aReserva(r, usuarioId) {
  const totalDias = diasEntre(r.fecha_inicio, r.fecha_fin) + 1;
  const dia = Math.min(Math.max(diasEntre(r.fecha_inicio, r.hoy) + 1, 0), totalDias);
  return {
    id: r.id,
    servicio: r.servicio,
    estado: r.estado,
    fase: r.fase,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    hoy: r.hoy,
    diaActual: r.fase === 'en_curso' ? dia : null,
    totalDias,
    total: Number(r.total),
    moneda: r.moneda.trim(),
    soy: String(r.viajero_id) === String(usuarioId) ? 'viajero' : 'cuidador',
    mascota: { id: r.mascota_id, nombre: r.mascota, especie: r.especie, raza: r.raza, foto: r.mascota_foto },
    viajero: { id: r.viajero_id, nombre: r.viajero },
    cuidador: { id: r.cuidador_id, nombre: r.cuidador, foto: fotoPerfil(r.cuidador_foto) },
    chat: { abierto: r.chat_abierto, cierraEl: r.chat_cierra },
  };
}

// Reserva de la que la persona es viajero o cuidador; si no, 404 (no se revela que existe).
async function reservaDe(usuarioId, id) {
  const r = await pool.query(`${SELECCION} WHERE r.id = $1 AND (r.viajero_id = $2 OR r.cuidador_id = $2)`, [id, usuarioId]);
  if (!r.rows[0]) throw new ErrorSeguimiento(404, 'Reserva no encontrada');
  return r.rows[0];
}

/* ───────────── Historial ───────────── */

const ORDEN_FASE = { en_curso: 0, proxima: 1, pendiente: 2, terminada: 3, inactiva: 4 };

// Todas las reservas de la persona (como viajero o como cuidador) con su resumen de seguimiento.
export async function historial(usuarioId) {
  const r = await pool.query(
    `SELECT b.*,
            (SELECT COUNT(*)::int FROM reportes_servicio WHERE reserva_id = b.id) AS n_reportes,
            (SELECT COUNT(*)::int FROM mensajes_reserva WHERE reserva_id = b.id) AS n_mensajes,
            (SELECT COUNT(*)::int FROM mensajes_reserva
              WHERE reserva_id = b.id AND autor_id <> $1 AND leido_en IS NULL) AS n_sin_leer,
            (SELECT COUNT(*)::int FROM alertas_emergencia WHERE reserva_id = b.id) AS n_alertas
       FROM (${SELECCION} WHERE r.viajero_id = $1 OR r.cuidador_id = $1) b`,
    [usuarioId]
  );
  return r.rows
    .map((x) => ({
      ...aReserva(x, usuarioId),
      resumen: { reportes: x.n_reportes, mensajes: x.n_mensajes, sinLeer: x.n_sin_leer, alertas: x.n_alertas },
    }))
    .sort((a, b) => ORDEN_FASE[a.fase] - ORDEN_FASE[b.fase]
      || (a.fase === 'proxima' ? a.fechaInicio.localeCompare(b.fechaInicio) : b.fechaInicio.localeCompare(a.fechaInicio)));
}

/* ───────────── Detalle (HU-30 y HU-28) ───────────── */

export async function detalle(usuarioId, id) {
  const fila = await reservaDe(usuarioId, id);
  const reserva = aReserva(fila, usuarioId);

  const [reportes, alertas, veterinario, contacto, sinLeer] = await Promise.all([
    pool.query(
      `SELECT r.id, r.titulo, r.nota, r.foto_url, r.creado_en,
              (r.creado_en AT TIME ZONE '${ZONA.replaceAll("'", '')}')::date::text AS dia
         FROM reportes_servicio r WHERE r.reserva_id = $1 ORDER BY r.creado_en DESC`,
      [id]
    ),
    pool.query('SELECT id, mensaje, avisado_contacto, creado_en FROM alertas_emergencia WHERE reserva_id = $1 ORDER BY creado_en DESC', [id]),
    pool.query('SELECT nombre, clinica, telefono, direccion FROM veterinarios_mascota WHERE mascota_id = $1', [fila.mascota_id]),
    // El contacto de emergencia solo lo ve el viajero que lo registró.
    reserva.soy === 'viajero'
      ? pool.query('SELECT nombre, parentesco, telefono, correo FROM contactos_emergencia WHERE usuario_id = $1', [usuarioId])
      : null,
    pool.query('SELECT COUNT(*)::int AS n FROM mensajes_reserva WHERE reserva_id = $1 AND autor_id <> $2 AND leido_en IS NULL', [id, usuarioId]),
  ]);

  // HU-30: días del servicio (hasta hoy) en los que el cuidador no subió ningún reporte.
  const conReporte = new Set(reportes.rows.map((x) => x.dia));
  const ultimoDia = fila.hoy < fila.fecha_fin ? fila.hoy : fila.fecha_fin;
  const diasSinReporte = [];
  if (['en_curso', 'terminada'].includes(fila.fase)) {
    for (let d = fila.fecha_inicio; d <= ultimoDia; d = sumarDias(d, 1)) {
      if (!conReporte.has(d)) diasSinReporte.push(d);
    }
  }

  return {
    reserva: {
      ...reserva,
      chat: { ...reserva.chat, sinLeer: sinLeer.rows[0].n },
      // Datos completos de la reserva para la página de detalle.
      tarifa: Number(fila.tarifa),
      unidades: fila.unidades,
      nota: fila.nota,
      motivoRechazo: fila.motivo_rechazo,
      creadaEn: fila.creado_en,
      respondidaEn: fila.respondida_en,
      responderAntes: fila.responder_antes,
      mascota: {
        ...reserva.mascota,
        edadMeses: fila.edad_meses,
        pesoKg: fila.peso_kg === null ? null : Number(fila.peso_kg),
        vacunas: fila.vacunas,
        microchip: fila.microchip,
        indicaciones: fila.indicaciones_medicas,
        fina: fila.es_fina,
      },
      cuidador: { ...reserva.cuidador, barrio: fila.cuidador_barrio, ciudad: fila.cuidador_ciudad },
      viajero: { ...reserva.viajero, foto: fotoPerfil(fila.viajero_foto) },
    },
    reportes: reportes.rows.map((x) => ({ id: x.id, titulo: x.titulo, nota: x.nota, foto: x.foto_url, creadoEn: x.creado_en, dia: x.dia })),
    diasSinReporte,
    reporteHoy: conReporte.has(fila.hoy),
    puedeReportar: reserva.soy === 'cuidador' && fila.fase === 'en_curso',
    emergencia: {
      puedeAlertar: reserva.soy === 'viajero' && fila.fase === 'en_curso',
      contacto: contacto?.rows[0] ?? null,
      veterinario: veterinario.rows[0] ?? null,
      alertas: alertas.rows.map((x) => ({ id: x.id, mensaje: x.mensaje, avisadoContacto: x.avisado_contacto, creadoEn: x.creado_en })),
    },
  };
}

/* ───────────── HU-30: reportes ───────────── */

export async function crearReporte(usuarioId, id, { titulo, nota }, foto) {
  const fila = await reservaDe(usuarioId, id);
  if (String(fila.cuidador_id) !== String(usuarioId)) throw new ErrorSeguimiento(403, 'Solo el cuidador sube reportes');
  if (fila.fase !== 'en_curso') throw new ErrorSeguimiento(409, 'Los reportes se suben mientras el servicio está en curso');
  const t = String(titulo ?? '').trim().slice(0, 80);
  if (!t) throw new ErrorSeguimiento(400, 'Escribe un título, por ejemplo "Paseo en el parque"');
  const n = String(nota ?? '').trim().slice(0, 1000) || null;
  if (!n && !foto) throw new ErrorSeguimiento(400, 'Agrega una foto o cuéntale al viajero cómo va');

  const r = await pool.query(
    `INSERT INTO reportes_servicio (reserva_id, autor_id, titulo, nota, foto_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, titulo, nota, foto_url AS foto, creado_en AS "creadoEn"`,
    [id, usuarioId, t, n, foto]
  );
  return r.rows[0];
}

/* ───────────── HU-31: chat ───────────── */

// Mensajes posteriores a `despues` (para consultar cada pocos segundos sin traer todo otra vez).
// Al leerlos se marcan como leídos los que escribió la otra persona.
export async function mensajes(usuarioId, id, despues) {
  const fila = await reservaDe(usuarioId, id);
  const desde = /^\d+$/.test(String(despues ?? '')) ? despues : 0;
  const r = await pool.query(
    `SELECT id, autor_id, texto, leido_en, creado_en FROM mensajes_reserva
      WHERE reserva_id = $1 AND id > $2 ORDER BY id LIMIT ${MAX_MENSAJES}`,
    [id, desde]
  );
  await pool.query(
    'UPDATE mensajes_reserva SET leido_en = NOW() WHERE reserva_id = $1 AND autor_id <> $2 AND leido_en IS NULL',
    [id, usuarioId]
  );
  return {
    abierto: fila.chat_abierto,
    cierraEl: fila.chat_cierra,
    mensajes: r.rows.map((m) => ({
      id: m.id, texto: m.texto, creadoEn: m.creado_en, leido: Boolean(m.leido_en), mio: String(m.autor_id) === String(usuarioId),
    })),
  };
}

export async function enviarMensaje(usuarioId, id, texto) {
  const fila = await reservaDe(usuarioId, id);
  if (!fila.chat_abierto) {
    throw new ErrorSeguimiento(409, fila.fase === 'inactiva'
      ? 'Esta reserva ya no está activa'
      : 'El chat se cerró 7 días después del servicio. El historial queda como evidencia');
  }
  const t = String(texto ?? '').trim().slice(0, 1000);
  if (!t) throw new ErrorSeguimiento(400, 'Escribe un mensaje');
  const r = await pool.query(
    'INSERT INTO mensajes_reserva (reserva_id, autor_id, texto) VALUES ($1, $2, $3) RETURNING id, texto, creado_en',
    [id, usuarioId, t]
  );
  const m = r.rows[0];
  return { id: m.id, texto: m.texto, creadoEn: m.creado_en, leido: false, mio: true };
}

/* ───────────── HU-28: emergencia ───────────── */

export async function alertar(usuarioId, id, mensaje) {
  const fila = await reservaDe(usuarioId, id);
  if (String(fila.viajero_id) !== String(usuarioId)) throw new ErrorSeguimiento(403, 'Solo el viajero puede activar la emergencia');
  if (fila.fase !== 'en_curso') throw new ErrorSeguimiento(409, 'El botón de emergencia funciona mientras el servicio está en curso');
  const texto = String(mensaje ?? '').trim().slice(0, 500) || 'El viajero activó el botón de emergencia.';

  const [contacto, veterinario] = await Promise.all([
    pool.query('SELECT nombre, parentesco, telefono, correo FROM contactos_emergencia WHERE usuario_id = $1', [usuarioId]),
    pool.query('SELECT nombre, clinica, telefono, direccion FROM veterinarios_mascota WHERE mascota_id = $1', [fila.mascota_id]),
  ]);
  const c = contacto.rows[0] ?? null;
  const v = veterinario.rows[0] ?? null;

  const detalleTexto = [
    `Reserva #${fila.id}: ${fila.mascota} con ${fila.cuidador} (${fila.fecha_inicio} a ${fila.fecha_fin}).`,
    `Viajero: ${fila.viajero} · ${fila.viajero_correo}`,
    `Mensaje: ${texto}`,
    v ? `Veterinario: ${v.nombre}${v.clinica ? ` (${v.clinica})` : ''} · ${v.telefono}` : 'Veterinario: no registrado',
  ].join('\n');

  const [avisadoContacto] = await Promise.all([
    c?.correo
      ? avisar(c.correo, `Emergencia con ${fila.mascota}`, `Hola ${c.nombre}, ${fila.viajero} te registró como contacto de emergencia.\n\n${detalleTexto}`)
      : false,
    avisar(correoSoporte() ?? null, `[Emergencia] Reserva #${fila.id}`, detalleTexto)
      .then((ok) => ok || console.warn(`[seguimiento] Emergencia sin correo de soporte (SOPORTE_CORREO):\n${detalleTexto}`)),
  ]);

  const r = await pool.query(
    `INSERT INTO alertas_emergencia (reserva_id, autor_id, mensaje, avisado_contacto)
     VALUES ($1, $2, $3, $4) RETURNING id, mensaje, avisado_contacto AS "avisadoContacto", creado_en AS "creadoEn"`,
    [id, usuarioId, texto, Boolean(avisadoContacto)]
  );
  return { alerta: r.rows[0], contacto: c, veterinario: v };
}

export async function leerContacto(usuarioId) {
  const r = await pool.query('SELECT nombre, parentesco, telefono, correo FROM contactos_emergencia WHERE usuario_id = $1', [usuarioId]);
  return r.rows[0] ?? null;
}

export async function guardarContacto(usuarioId, d) {
  const nombre = String(d.nombre ?? '').trim().slice(0, 120);
  const telefono = String(d.telefono ?? '').trim();
  const correo = String(d.correo ?? '').trim().toLowerCase() || null;
  const parentesco = String(d.parentesco ?? '').trim().slice(0, 40) || null;
  if (!nombre) throw new ErrorSeguimiento(400, 'Escribe el nombre de tu contacto');
  if (!TELEFONO.test(telefono)) throw new ErrorSeguimiento(400, 'Escribe un teléfono válido');
  if (correo && !esCorreo(correo)) throw new ErrorSeguimiento(400, 'El correo no es válido');
  const r = await pool.query(
    `INSERT INTO contactos_emergencia (usuario_id, nombre, parentesco, telefono, correo)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id) DO UPDATE
       SET nombre = EXCLUDED.nombre, parentesco = EXCLUDED.parentesco, telefono = EXCLUDED.telefono,
           correo = EXCLUDED.correo, actualizado_en = NOW()
     RETURNING nombre, parentesco, telefono, correo`,
    [usuarioId, nombre, parentesco, telefono, correo]
  );
  return r.rows[0];
}

// Mascotas activas de la persona con su veterinario (o null), para la pantalla de emergencia.
export async function veterinarios(usuarioId) {
  const r = await pool.query(
    `SELECT m.id, m.nombre, m.especie, m.foto_url, v.nombre AS vet_nombre, v.clinica, v.telefono, v.direccion
       FROM mascotas m LEFT JOIN veterinarios_mascota v ON v.mascota_id = m.id
      WHERE m.usuario_id = $1 AND m.status ORDER BY m.nombre`,
    [usuarioId]
  );
  return r.rows.map((m) => ({
    id: m.id, nombre: m.nombre, especie: m.especie, foto: m.foto_url,
    veterinario: m.vet_nombre ? { nombre: m.vet_nombre, clinica: m.clinica, telefono: m.telefono, direccion: m.direccion } : null,
  }));
}

export async function guardarVeterinario(usuarioId, mascotaId, d) {
  const m = await pool.query('SELECT 1 FROM mascotas WHERE id = $1 AND usuario_id = $2', [mascotaId, usuarioId]);
  if (!m.rows[0]) throw new ErrorSeguimiento(404, 'Mascota no encontrada');
  const nombre = String(d.nombre ?? '').trim().slice(0, 120);
  const telefono = String(d.telefono ?? '').trim();
  if (!nombre) throw new ErrorSeguimiento(400, 'Escribe el nombre del veterinario');
  if (!TELEFONO.test(telefono)) throw new ErrorSeguimiento(400, 'Escribe un teléfono válido');
  const r = await pool.query(
    `INSERT INTO veterinarios_mascota (mascota_id, nombre, clinica, telefono, direccion)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (mascota_id) DO UPDATE
       SET nombre = EXCLUDED.nombre, clinica = EXCLUDED.clinica, telefono = EXCLUDED.telefono,
           direccion = EXCLUDED.direccion, actualizado_en = NOW()
     RETURNING nombre, clinica, telefono, direccion`,
    [mascotaId, nombre, String(d.clinica ?? '').trim().slice(0, 120) || null, telefono,
      String(d.direccion ?? '').trim().slice(0, 200) || null]
  );
  return r.rows[0];
}

/* ───────────── Campana de notificaciones ───────────── */

const DIAS_NOTIFICACIONES = 30;
const MAX_NOTIFICACIONES = 60;

// Avisos de los últimos 30 días armados con lo que ya existe (no hay tabla de avisos).
// tipo: reservas · reportes · mensajes · alertas.
// `nueva`: llegó después de la última vez que se abrió la bandeja (cuenta en la campana).
// `leida`: ya se tocó, o se marcaron todas como leídas después de que llegó (deja de verse resaltada).
export async function notificaciones(usuarioId) {
  const r = await pool.query(
    `WITH mias AS (
       SELECT r.*, m.nombre AS mascota, uv.nombre AS viajero, uc.nombre AS cuidador
         FROM reservas r
         JOIN mascotas m ON m.id = r.mascota_id
         JOIN usuarios uv ON uv.id = r.viajero_id
         JOIN usuarios uc ON uc.id = r.cuidador_id
        WHERE r.viajero_id = $1 OR r.cuidador_id = $1
     ), avisos AS (
       -- Reportes del cuidador (para el viajero)
       SELECT 'reportes' AS tipo, 'rep-' || p.id AS id, p.creado_en AS fecha, mi.id AS reserva_id,
              'Nuevo reporte de ' || mi.mascota AS titulo,
              split_part(mi.cuidador, ' ', 1) || ' compartió: ' || p.titulo || CASE WHEN p.foto_url IS NOT NULL THEN ' (con foto)' ELSE '' END AS texto,
              '/reservas/' || mi.id || '/seguimiento' AS enlace
         FROM reportes_servicio p JOIN mias mi ON mi.id = p.reserva_id
        WHERE mi.viajero_id = $1
       UNION ALL
       -- Mensajes de la otra persona
       SELECT 'mensajes', 'msj-' || x.id, x.creado_en, mi.id,
              'Mensaje de ' || split_part(CASE WHEN mi.viajero_id = $1 THEN mi.cuidador ELSE mi.viajero END, ' ', 1),
              left(x.texto, 120), '/reservas/' || mi.id || '/chat'
         FROM mensajes_reserva x JOIN mias mi ON mi.id = x.reserva_id
        WHERE x.autor_id <> $1
       UNION ALL
       -- Respuesta del cuidador a la solicitud (para el viajero)
       SELECT 'reservas', 'res-' || mi.id || '-' || mi.estado, mi.respondida_en, mi.id,
              CASE mi.estado WHEN 'rechazada' THEN 'Reserva rechazada' ELSE 'Reserva confirmada' END,
              split_part(mi.cuidador, ' ', 1) ||
                CASE mi.estado WHEN 'rechazada' THEN ' no puede cuidar a ' ELSE ' aceptó cuidar a ' END ||
                mi.mascota || ' del ' || to_char(mi.fecha_inicio, 'DD/MM') || ' al ' || to_char(mi.fecha_fin, 'DD/MM'),
              '/reservas'
         FROM mias mi
        WHERE mi.viajero_id = $1 AND mi.respondida_en IS NOT NULL AND mi.estado IN ('confirmada', 'rechazada', 'en_curso', 'completada')
       UNION ALL
       -- Solicitudes nuevas (para el cuidador)
       SELECT 'reservas', 'sol-' || mi.id, mi.creado_en, mi.id,
              'Nueva solicitud de ' || split_part(mi.viajero, ' ', 1),
              mi.mascota || ' del ' || to_char(mi.fecha_inicio, 'DD/MM') || ' al ' || to_char(mi.fecha_fin, 'DD/MM') ||
                CASE WHEN mi.estado = 'pendiente' THEN '. Responde en 24 horas.' ELSE '' END,
              '/reservas'
         FROM mias mi
        WHERE mi.cuidador_id = $1
       UNION ALL
       -- Emergencias de las reservas que la persona cuida
       SELECT 'alertas', 'ale-' || a.id, a.creado_en, mi.id,
              'Emergencia con ' || mi.mascota, a.mensaje, '/reservas/' || mi.id || '/seguimiento'
         FROM alertas_emergencia a JOIN mias mi ON mi.id = a.reserva_id
        WHERE mi.cuidador_id = $1
       UNION ALL
       -- Recordatorio: el servicio termina mañana
       SELECT 'reservas', 'rec-' || mi.id, ${HOY}::timestamp AT TIME ZONE '${ZONA.replaceAll("'", '')}', mi.id,
              CASE WHEN mi.viajero_id = $1 THEN 'Mañana recoges a ' ELSE 'Mañana entregas a ' END || mi.mascota,
              'El servicio con ' || split_part(CASE WHEN mi.viajero_id = $1 THEN mi.cuidador ELSE mi.viajero END, ' ', 1) ||
                ' termina el ' || to_char(mi.fecha_fin, 'DD/MM') || '.',
              '/reservas/' || mi.id || '/seguimiento'
         FROM mias mi
        WHERE mi.estado IN ('confirmada', 'en_curso') AND mi.fecha_fin = ${HOY} + 1
     )
     SELECT a.*, a.fecha > COALESCE(v.visto_hasta, '-infinity') AS nueva,
            (l.aviso_id IS NOT NULL OR a.fecha <= COALESCE(v.leidas_hasta, '-infinity')) AS leida
       FROM avisos a
       LEFT JOIN notificaciones_vistas v ON v.usuario_id = $1
       LEFT JOIN notificaciones_leidas l ON l.usuario_id = $1 AND l.aviso_id = a.id
      WHERE a.fecha > NOW() - INTERVAL '${DIAS_NOTIFICACIONES} days'
      ORDER BY a.fecha DESC
      LIMIT ${MAX_NOTIFICACIONES}`,
    [usuarioId]
  );
  const lista = r.rows.map((n) => ({
    id: n.id, tipo: n.tipo, fecha: n.fecha, reservaId: n.reserva_id,
    titulo: n.titulo, texto: n.texto, enlace: n.enlace, nueva: n.nueva, leida: n.leida,
  }));
  return {
    nuevas: lista.filter((n) => n.nueva && !n.leida).length,
    sinLeer: lista.filter((n) => !n.leida).length,
    notificaciones: lista,
  };
}

// Al abrir la bandeja: la campana vuelve a 0, pero los avisos siguen sin leer.
export async function marcarVistas(usuarioId) {
  await pool.query(
    `INSERT INTO notificaciones_vistas (usuario_id, visto_hasta) VALUES ($1, NOW())
     ON CONFLICT (usuario_id) DO UPDATE SET visto_hasta = NOW()`,
    [usuarioId]
  );
  return { ok: true };
}

// Al tocar un aviso.
export async function marcarLeida(usuarioId, avisoId) {
  if (!/^[a-z]{3}-[\w-]{1,32}$/.test(String(avisoId))) throw new ErrorSeguimiento(400, 'Aviso no válido');
  await pool.query(
    `INSERT INTO notificaciones_leidas (usuario_id, aviso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [usuarioId, avisoId]
  );
  return { ok: true };
}

// "Marcar leídas": todos los avisos hasta ahora quedan leídos (y vistos).
export async function marcarLeidas(usuarioId) {
  await pool.query(
    `INSERT INTO notificaciones_vistas (usuario_id, visto_hasta, leidas_hasta) VALUES ($1, NOW(), NOW())
     ON CONFLICT (usuario_id) DO UPDATE SET visto_hasta = NOW(), leidas_hasta = NOW()`,
    [usuarioId]
  );
  return { ok: true };
}
