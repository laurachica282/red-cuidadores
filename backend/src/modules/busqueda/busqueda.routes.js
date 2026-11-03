import { Router } from 'express';
import { pool } from '../../db.js';
import { verificarToken } from '../auth/verificarToken.js';
import { buscarDirecciones, direccionDe } from './geocodificacion.js';

const router = Router();
router.use(verificarToken);

const TIPOS_MASCOTA = new Set(['perro', 'gato', 'ave', 'conejo', 'otro']);
// Servicios de 12_servicios_cuidador.sql, en el orden del mockup, con la unidad de su tarifa.
const SERVICIOS = { alojamiento: 'noche', domicilio: 'visita', paseo: 'paseo', guarderia: 'día' };
const ORDENES = {
  calificacion: 'calificacion_promedio DESC NULLS LAST, d.distancia_km ASC NULLS LAST, s.tarifa ASC',
  distancia: 'd.distancia_km ASC NULLS LAST, calificacion_promedio DESC NULLS LAST',
  precio: 's.tarifa ASC',
  precio_desc: 's.tarifa DESC',
};
const RADIO_KM = { defecto: 10, max: 50 };
const MAX_RESENAS = 20;

// La foto de perfil la sirve el módulo cuenta en /api/cuenta/fotos/:archivo (HU-09).
const urlFotoPerfil = (archivo) => (archivo ? `/cuenta/fotos/${archivo}` : null);

const esFecha = (t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t));
const numeroOpcional = (t) => (t === undefined || t === '' ? null : Number(t));
const esLatitud = (n) => Number.isFinite(n) && n >= -90 && n <= 90;
const esLongitud = (n) => Number.isFinite(n) && n >= -180 && n <= 180;

function errorFechas(desde, hasta) {
  if (!desde && !hasta) return null;
  if (!esFecha(desde) || !esFecha(hasta)) return 'Elige fecha de inicio y de fin';
  if (desde >= hasta) return 'La fecha de fin debe ser posterior a la de inicio';
  if (desde < new Date().toISOString().slice(0, 10)) return 'La fecha de inicio ya pasó';
  return null;
}

function errorUbicacion(lat, lng, radioKm) {
  if ((lat === null) !== (lng === null)) return 'La ubicación está incompleta';
  if (lat !== null && (!esLatitud(lat) || !esLongitud(lng))) return 'La ubicación no es válida';
  if (!Number.isFinite(radioKm) || radioKm <= 0 || radioKm > RADIO_KM.max) return `El radio debe estar entre 1 y ${RADIO_KM.max} km`;
  return null;
}

// Lee y valida los filtros de HU-15. Devuelve { error } si alguno no sirve.
function leerFiltros(q) {
  const texto = String(q.q ?? '').trim().slice(0, 80);
  // Sin ciudad: se usa la del perfil. 'todas' quita el filtro. Con punto (lat/lng) la ciudad no aplica.
  const ciudad = q.ciudad === undefined ? null : String(q.ciudad).trim().slice(0, 80);
  const tipo = String(q.tipo ?? '').trim();
  // Vacío = todos los servicios.
  const servicio = String(q.servicio ?? '').trim();
  const precioMin = numeroOpcional(q.precioMin);
  const precioMax = numeroOpcional(q.precioMax);
  const lat = numeroOpcional(q.lat);
  const lng = numeroOpcional(q.lng);
  const radioKm = numeroOpcional(q.radioKm) ?? RADIO_KM.defecto;
  const desde = String(q.desde ?? '');
  const hasta = String(q.hasta ?? '');
  const orden = ORDENES[q.orden] ? q.orden : 'calificacion';

  if (tipo && !TIPOS_MASCOTA.has(tipo)) return { error: 'Tipo de mascota no válido' };
  if (servicio && !(servicio in SERVICIOS)) return { error: 'Tipo de servicio no válido' };
  if ([precioMin, precioMax].some((p) => p !== null && (!Number.isFinite(p) || p < 0))) {
    return { error: 'El precio debe ser un número positivo' };
  }
  if (precioMin !== null && precioMax !== null && precioMin > precioMax) {
    return { error: 'El precio mínimo no puede ser mayor que el máximo' };
  }
  const error = errorUbicacion(lat, lng, radioKm) ?? errorFechas(desde, hasta);
  if (error) return { error };
  return { texto, ciudad, tipo, servicio, precioMin, precioMax, lat, lng, radioKm, desde, hasta, orden };
}

/* ───────────── HU-15: buscar cuidadores ───────────── */

// Solo cuidadores visibles (antecedentes aprobados y vigentes, RN-3) y de la región de quien busca (HU-36).
// Con un punto (lat/lng) se buscan los que están dentro del radio; sin punto, por ciudad.
// Las fechas se validan pero aún no filtran: hace falta la tabla de reservas (HU-17) para saber quién está ocupado.
router.get('/cuidadores', async (req, res) => {
  const f = leerFiltros(req.query);
  if (f.error) return res.status(400).json({ error: f.error });

  try {
    const [ubicacion, ciudades] = await Promise.all([
      pool.query(
        `SELECT u.ciudad, u.pais, g.nombre AS pais_nombre, g.moneda
           FROM usuarios u LEFT JOIN regiones_reglas g ON g.pais = u.pais
          WHERE u.id = $1`,
        [req.usuario.id]
      ),
      // Ciudades de la región con cuidadores visibles: atajos para elegir la zona.
      pool.query(
        `SELECT ciudad, COUNT(*)::int AS cantidad
           FROM cuidadores_visibles
          WHERE pais = (SELECT pais FROM usuarios WHERE id = $1) AND ciudad IS NOT NULL
          GROUP BY ciudad ORDER BY COUNT(*) DESC, ciudad`,
        [req.usuario.id]
      ),
    ]);
    const u = ubicacion.rows[0];
    const conPunto = f.lat !== null;

    // Sin punto ni ciudad elegida se usa la ciudad del perfil, o todo el país si no la tiene.
    let ciudad = conPunto ? 'todas' : f.ciudad;
    if (ciudad === null) ciudad = u?.ciudad ?? 'todas';
    const filtroCiudad = ciudad === 'todas' ? '' : ciudad;

    const r = await pool.query(
      `SELECT v.usuario_id, v.nombre, v.ciudad, s.servicio, s.tarifa, p.tipos_mascota, p.barrio, g.moneda,
              ROUND(p.latitud, 3) AS lat, ROUND(p.longitud, 3) AS lng, d.distancia_km,
              c.calificacion_promedio, c.total_resenas,
              (SELECT foto_url FROM usuarios WHERE id = v.usuario_id) AS foto_perfil,
              (SELECT array_agg(x.servicio ORDER BY array_position($11::text[], x.servicio::text))
                 FROM servicios_cuidador x WHERE x.usuario_id = v.usuario_id AND x.activo) AS servicios
         FROM cuidadores_visibles v
         JOIN perfiles_cuidador p ON p.usuario_id = v.usuario_id
         -- Precio que se muestra: el del servicio buscado o, con "todos", el más barato dentro del rango.
         -- Sin fila (no ofrece el servicio o ninguno cae en el rango de precio) el cuidador no sale.
         JOIN LATERAL (
           SELECT servicio, tarifa FROM servicios_cuidador
            WHERE usuario_id = v.usuario_id AND activo
              AND ($10 = '' OR servicio = $10)
              AND ($4::numeric IS NULL OR tarifa >= $4)
              AND ($5::numeric IS NULL OR tarifa <= $5)
            ORDER BY tarifa LIMIT 1
         ) s ON TRUE
         JOIN regiones_reglas g ON g.pais = v.pais
         LEFT JOIN LATERAL (
           SELECT ROUND(AVG(calificacion), 1) AS calificacion_promedio, COUNT(*) AS total_resenas
             FROM resenas WHERE cuidador_id = v.usuario_id
         ) c ON TRUE
         -- Distancia en km (fórmula del haversine), solo si hay punto y el cuidador tiene ubicación.
         LEFT JOIN LATERAL (
           SELECT 2 * 6371 * ASIN(SQRT(
                    POWER(SIN(RADIANS(p.latitud - $7::float8) / 2), 2)
                    + COS(RADIANS($7::float8)) * COS(RADIANS(p.latitud)) * POWER(SIN(RADIANS(p.longitud - $8::float8) / 2), 2)
                  )) AS distancia_km
            WHERE $7::float8 IS NOT NULL AND p.latitud IS NOT NULL
         ) d ON TRUE
        WHERE v.pais = (SELECT pais FROM usuarios WHERE id = $1)
          AND ($2 = '' OR v.nombre ILIKE '%' || $2 || '%' OR p.barrio ILIKE '%' || $2 || '%')
          AND ($3 = '' OR $3 = ANY (p.tipos_mascota))
          AND ($6 = '' OR lower(v.ciudad) = lower($6))
          AND ($7::float8 IS NULL OR d.distancia_km <= $9::float8)
        ORDER BY ${ORDENES[f.orden]}, v.nombre`,
      [req.usuario.id, f.texto, f.tipo, f.precioMin, f.precioMax, filtroCiudad, f.lat, f.lng, f.radioKm, f.servicio, Object.keys(SERVICIOS)]
    );

    res.json({
      ubicacion: { ciudad: u?.ciudad ?? null, pais: u?.pais, paisNombre: u?.pais_nombre, moneda: u?.moneda?.trim() },
      ciudades: ciudades.rows.map((c) => ({ nombre: c.ciudad, cantidad: c.cantidad })),
      ciudadAplicada: ciudad,
      punto: conPunto ? { lat: f.lat, lng: f.lng, radioKm: f.radioKm } : null,
      servicio: f.servicio || null,
      fechasAplicadas: false,
      cuidadores: r.rows.map((c) => ({
        id: c.usuario_id,
        nombre: c.nombre,
        ciudad: c.ciudad,
        barrio: c.barrio,
        // Punto aproximado (~100 m): nunca la dirección exacta.
        ubicacion: c.lat === null ? null : { lat: Number(c.lat), lng: Number(c.lng) },
        distanciaKm: c.distancia_km === null ? null : Math.round(c.distancia_km * 10) / 10,
        // Con "todos" es el precio desde: el servicio más barato que ofrece.
        servicioPrecio: c.servicio,
        tarifa: Number(c.tarifa),
        unidad: SERVICIOS[c.servicio],
        servicios: c.servicios ?? [],
        moneda: c.moneda.trim(),
        tiposMascota: c.tipos_mascota,
        calificacion: c.calificacion_promedio === null ? null : Number(c.calificacion_promedio),
        totalResenas: Number(c.total_resenas),
        fotoPerfil: urlFotoPerfil(c.foto_perfil),
        verificado: true,
      })),
    });
  } catch (e) {
    console.error('[busqueda] GET /cuidadores', e);
    res.status(500).json({ error: 'No se pudo hacer la búsqueda' });
  }
});

/* ───────────── Direcciones (mapa) ───────────── */

// Escribir una dirección y ubicarla en el mapa. Se limita al país de quien busca.
router.get('/direcciones', async (req, res) => {
  const texto = String(req.query.q ?? '').trim().slice(0, 150);
  if (texto.length < 3) return res.json({ resultados: [] });
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const cerca = esLatitud(lat) && esLongitud(lng) && req.query.lat && req.query.lng ? { lat, lng } : null;
  try {
    const p = await pool.query('SELECT pais FROM usuarios WHERE id = $1', [req.usuario.id]);
    res.json({ resultados: await buscarDirecciones(texto, p.rows[0]?.pais, cerca) });
  } catch (e) {
    console.error('[busqueda] GET /direcciones', e);
    res.status(502).json({ error: 'No pudimos buscar la dirección. Inténtalo en un momento.' });
  }
});

// Mover el pin en el mapa y obtener la dirección de ese punto.
router.get('/direcciones/inversa', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!esLatitud(lat) || !esLongitud(lng)) return res.status(400).json({ error: 'La ubicación no es válida' });
  try {
    const direccion = await direccionDe(lat, lng);
    res.json({ direccion: direccion ? { ...direccion, lat, lng } : null });
  } catch (e) {
    console.error('[busqueda] GET /direcciones/inversa', e);
    res.status(502).json({ error: 'No pudimos leer la dirección de ese punto.' });
  }
});

/* ───────────── HU-16: perfil del cuidador ───────────── */

router.get('/cuidadores/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Este cuidador no está disponible' });

  try {
    const r = await pool.query(
      `SELECT v.*, p.barrio, g.moneda, u.creado_en AS en_la_red_desde, u.foto_url
         FROM cuidadores_visibles v
         JOIN perfiles_cuidador p ON p.usuario_id = v.usuario_id
         JOIN usuarios u ON u.id = v.usuario_id
         JOIN regiones_reglas g ON g.pais = v.pais
        WHERE v.usuario_id = $1`,
      [req.params.id]
    );
    const c = r.rows[0];
    if (!c) return res.status(404).json({ error: 'Este cuidador no está disponible' });

    const [fotos, resumen, resenas, servicios] = await Promise.all([
      pool.query(
        `SELECT id FROM archivos_cuidador WHERE usuario_id = $1 AND tipo = 'foto_espacio' AND activo ORDER BY id`,
        [c.usuario_id]
      ),
      pool.query(
        `SELECT ROUND(AVG(calificacion), 1) AS promedio, COUNT(*) AS total FROM resenas WHERE cuidador_id = $1`,
        [c.usuario_id]
      ),
      // Si el autor desactivó su cuenta, no se muestra su nombre (HU-41).
      pool.query(
        `SELECT r.id, r.calificacion, r.comentario, r.creado_en,
                CASE WHEN a.status THEN split_part(a.nombre, ' ', 1) END AS autor
           FROM resenas r JOIN usuarios a ON a.id = r.autor_id
          WHERE r.cuidador_id = $1
          ORDER BY r.creado_en DESC
          LIMIT ${MAX_RESENAS}`,
        [c.usuario_id]
      ),
      pool.query(
        `SELECT servicio, tarifa FROM servicios_cuidador
          WHERE usuario_id = $1 AND activo
          ORDER BY array_position($2::text[], servicio::text)`,
        [c.usuario_id, Object.keys(SERVICIOS)]
      ),
    ]);

    const s = resumen.rows[0];
    res.json({
      id: c.usuario_id,
      nombre: c.nombre,
      ciudad: c.ciudad,
      barrio: c.barrio,
      pais: c.pais,
      descripcion: c.descripcion ?? '',
      tarifaNoche: Number(c.tarifa_noche),
      servicios: servicios.rows.map((x) => ({ servicio: x.servicio, tarifa: Number(x.tarifa), unidad: SERVICIOS[x.servicio] })),
      moneda: c.moneda.trim(),
      tiposMascota: c.tipos_mascota,
      antecedentesVerificados: true,
      antecedentesVencenEn: c.antecedentes_vencen_en,
      enLaRedDesde: c.en_la_red_desde,
      fotos: fotos.rows.map((f) => f.id),
      fotoPerfil: urlFotoPerfil(c.foto_url),
      calificacion: s.promedio === null ? null : Number(s.promedio),
      totalResenas: Number(s.total),
      resenas: resenas.rows.map((x) => ({
        id: x.id,
        calificacion: x.calificacion,
        comentario: x.comentario,
        fecha: x.creado_en,
        autor: x.autor ?? 'Usuario de la red',
      })),
    });
  } catch (e) {
    console.error('[busqueda] GET /cuidadores/:id', e);
    res.status(500).json({ error: 'No se pudo cargar el perfil' });
  }
});

export default router;
