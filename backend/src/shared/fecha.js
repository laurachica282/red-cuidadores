// "Hoy" de la región del servicio. Los servidores (Render, Supabase) están en UTC y en Colombia,
// desde las 7 p. m., UTC ya es mañana: sin esto la app dice que una fecha "ya pasó" antes de tiempo.
export const ZONA = (process.env.ZONA_HORARIA ?? 'America/Bogota').replaceAll("'", '');

// Para usar dentro de SQL: fecha de hoy en la zona de la región.
export const HOY_SQL = `(NOW() AT TIME ZONE '${ZONA}')::date`;

// Fecha de hoy (AAAA-MM-DD) en la zona de la región, calculada en Node.
export function hoyISO(ahora = new Date()) {
  // en-CA da el formato AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}
