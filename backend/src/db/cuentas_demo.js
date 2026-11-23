// Genera cuentas_demo.md (raíz del repo, fuera de git) con todas las cuentas de demo: npm run db:cuentas.
// Correr después de npm run db:poblar. Todas las cuentas tienen la contraseña Demo2026.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.join(aqui, '../../../cuentas_demo.md');
const H = `(NOW() AT TIME ZONE 'America/Bogota')::date`;
const PAISES = { CO: 'Colombia', MX: 'México', ES: 'España', BR: 'Brasil', US: 'Estados Unidos' };
const ORDEN = `array_position(ARRAY['CO','MX','ES','BR','US'], u.pais::text), u.ciudad, u.nombre`;
const q = async (s, p) => (await pool.query(s, p)).rows;

async function main() {
  const cuid = await q(`SELECT u.correo, u.nombre, u.pais, u.ciudad, p.barrio,
      (SELECT string_agg(servicio || ' ' || ROUND(tarifa)::text || CASE WHEN servicio = 'alojamiento' THEN '/noche' ELSE '/h' END, ', ' ORDER BY servicio)
         FROM servicios_cuidador s WHERE s.usuario_id = u.id AND s.activo) servicios,
      (SELECT ROUND(AVG(calificacion), 1) FROM resenas WHERE cuidador_id = u.id) estrellas,
      EXISTS(SELECT 1 FROM cuidadores_visibles v WHERE v.usuario_id = u.id) visible,
      EXISTS(SELECT 1 FROM reservas r WHERE r.cuidador_id = u.id AND r.estado = 'en_curso') en_curso
    FROM usuarios u LEFT JOIN perfiles_cuidador p ON p.usuario_id = u.id
    WHERE u.rol = 'cuidador' AND u.correo LIKE '%@demo.redcuidadores.co' ORDER BY ${ORDEN}`);
  const viaj = await q(`SELECT u.correo, u.nombre, u.pais, u.ciudad,
      (SELECT string_agg(nombre, ', ' ORDER BY id) FROM mascotas WHERE usuario_id = u.id) mascotas,
      (SELECT count(*) FROM reservas WHERE viajero_id = u.id)::int reservas,
      EXISTS(SELECT 1 FROM reservas r WHERE r.viajero_id = u.id AND r.estado = 'en_curso') en_curso,
      EXISTS(SELECT 1 FROM reservas r WHERE r.viajero_id = u.id AND r.estado = 'confirmada'
             AND NOT EXISTS (SELECT 1 FROM pagos p WHERE p.reserva_id = r.id AND p.estado IN ('retenido', 'liberado'))) por_pagar,
      EXISTS(SELECT 1 FROM reservas r WHERE r.viajero_id = u.id AND r.estado = 'confirmada' AND r.fecha_inicio >= ${H} + 7
             AND EXISTS (SELECT 1 FROM pagos p WHERE p.reserva_id = r.id AND p.estado = 'retenido')) reembolso_total,
      EXISTS(SELECT 1 FROM reservas r WHERE r.viajero_id = u.id AND r.hora_inicio IS NOT NULL AND r.estado = 'confirmada') por_horas
    FROM usuarios u WHERE u.rol = 'viajero' AND u.correo LIKE '%@demo.redcuidadores.co' ORDER BY ${ORDEN}`);

  const grupos = (l) => Object.keys(PAISES).map((k) => [k, l.filter((x) => x.pais === k)]).filter(([, x]) => x.length);
  const lista = (l, n = 5) => l.slice(0, n).map((x) => `  - \`${x.correo}\` (${x.nombre}, ${x.ciudad})`).join('\n') || '  - (ninguno)';
  const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });

  let md = `# Red de Cuidadores · Cuentas de demostración

> **Contraseña de todas las cuentas: \`Demo2026\`**
> Generado el ${fecha}. ${cuid.length + viaj.length + 1} cuentas de demo.

⚠️ Datos ficticios para pruebas. No compartas este archivo fuera del equipo.

## Resumen

| Rol | Cuentas |
|---|---|
| Administrador | 1 |
| Cuidadores | ${cuid.length} |
| Viajeros | ${viaj.length} |

Países: ${grupos([...cuid, ...viaj]).map(([k, l]) => `${PAISES[k]} (${l.length})`).join(', ')}.
Alojamiento se cobra por noche; cuidado a domicilio, paseo y guardería, por hora.

## Para probar rápido

- **Administrador:** \`admin@demo.redcuidadores.co\`
- **Viajeros con un servicio EN CURSO hoy** (seguimiento, chat, emergencia):
${lista(viaj.filter((v) => v.en_curso))}
- **Cuidadores con un servicio EN CURSO hoy** (subir reportes, chat):
${lista(cuid.filter((v) => v.en_curso))}
- **Viajeros con una reserva confirmada SIN PAGAR** (botón Pagar; el chat bloquea teléfonos y correos hasta pagar):
${lista(viaj.filter((v) => v.por_pagar), 4)}
- **Viajeros con una reserva pagada a 7 días o más** (Cancelar reserva → reembolso del 100 %):
${lista(viaj.filter((v) => v.reembolso_total), 4)}
- **Viajeros con una reserva por horas confirmada** (paseo, guardería o domicilio):
${lista(viaj.filter((v) => v.por_horas), 4)}
- **España** (EUR; pagos con tarjeta, Bizum o PayPal):
${lista(viaj.filter((v) => v.pais === 'ES'), 3)}

En las tablas, **En curso ✅** marca las cuentas con un servicio activo hoy y **💳** las que tienen algo por pagar.

## Administrador

| Correo | Contraseña | Nombre |
|---|---|---|
| \`admin@demo.redcuidadores.co\` | Demo2026 | Admin Demo |

## Cuidadores (${cuid.length})

*Visible* = aparece en la búsqueda (antecedentes aprobados y vigentes).
`;
  for (const [k, l] of grupos(cuid)) {
    md += `\n### ${PAISES[k]} (${l.length})\n\n| Correo | Contraseña | Nombre | Ciudad · barrio | Servicios y precios | ★ | Visible | En curso |\n|---|---|---|---|---|---|---|---|\n`;
    md += l.map((x) => `| \`${x.correo}\` | Demo2026 | ${x.nombre} | ${x.ciudad} · ${x.barrio ?? ''} | ${x.servicios ?? ''} | ${x.estrellas ?? '—'} | ${x.visible ? 'Sí' : 'No'} | ${x.en_curso ? '✅' : ''} |`).join('\n') + '\n';
  }
  md += `\n## Viajeros (${viaj.length})\n`;
  for (const [k, l] of grupos(viaj)) {
    md += `\n### ${PAISES[k]} (${l.length})\n\n| Correo | Contraseña | Nombre | Ciudad | Mascotas | Reservas | En curso | Por pagar |\n|---|---|---|---|---|---|---|---|\n`;
    md += l.map((x) => `| \`${x.correo}\` | Demo2026 | ${x.nombre} | ${x.ciudad} | ${x.mascotas ?? ''} | ${x.reservas} | ${x.en_curso ? '✅' : ''} | ${x.por_pagar ? '💳' : ''} |`).join('\n') + '\n';
  }
  fs.writeFileSync(SALIDA, md);
  console.log(`cuentas_demo.md generado: ${cuid.length} cuidadores, ${viaj.length} viajeros`);
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => pool.end());
