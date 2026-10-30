# Módulo `cuenta` (Daniel Páez)

HU-06, HU-09, HU-32, HU-33, HU-35, HU-37, HU-39, HU-40 y HU-41. Backend en `backend/src/modules/cuenta`,
frontend en `frontend/src/modules/cuenta`, esquema en `backend/src/db/02_cuenta.sql`.

## Qué hace cada historia

| HU | Pantalla (frontend) | Endpoint (`/api/cuenta`) | Reglas que cumple |
| --- | --- | --- | --- |
| 09 | `/cuenta/datos` | `GET/PATCH /perfil`, `PUT/DELETE /perfil/foto` | Nombre, teléfono, ciudad y foto. El correo se rechaza aquí. La foto se valida por contenido (JPG/PNG/WEBP, 2 MB). |
| 06 | `/cuenta/correo` | `POST /correo/solicitar`, `POST /correo/confirmar` | Pide la clave actual; código de 6 dígitos al correo **nuevo**; aviso al anterior; no cambia hasta verificar. Vence a los 10 min, reenvío cada 60 s, máx. 5 intentos. |
| 32 | `/cuenta/notificaciones` (mockup 16) | `GET/PUT /notificaciones` | Dos listas, como el mockup: «Qué te avisamos» (reservas, reportes, mensajes, promociones) y «Por dónde» (teléfono, correo, SMS). Se avisa de un evento solo si está activo y por los canales activos (`canalesActivos`). |
| 35 | `/cuenta/region` (mockup 17) | `GET /regiones`, `PATCH /region` | Idioma, país y moneda. País → moneda por defecto, cambiable (RN-6). Solo afecta reservas nuevas. |
| 33 | `/cuenta/resenas`, `/cuenta/resenas/nueva/:reservaId` | `GET/POST /resenas`, `GET /resenas/reserva/:id` | 1 a 5 estrellas + comentario, solo reservas completadas del propio viajero, una por reserva. |
| 37 | `/cuenta/desactivar` (mockup 18) | `GET /cierre/pendientes` | Checklist «Antes de irte» con las 4 verificaciones de RN-4 (✓ o pendiente). |
| 39 | `/cuenta/desactivar` (mockup 18) | `POST /cierre/desactivar` | Clave + motivo; `status = false`, fecha y motivo guardados; no se borra nada (RN-5); la sesión deja de valer al instante. Se renombró «Eliminar cuenta» → «Desactivar cuenta» y se cambió el texto «se borrarán tus datos», que ya no es cierto. |
| 40 | `/reactivar` (pública) | `POST /reactivacion/solicitar`, `POST /reactivacion/confirmar` | Código por correo; responde igual exista o no la cuenta. **Una cuenta suspendida por un admin no se reactiva sola.** |
| 41 | `/cuenta/admin/desactivadas` | `GET /admin/cuentas`, `GET /admin/cuentas/:id/historial` | Solo admin. Sin nombre, correo ni teléfono. La vista `v_historial_cuentas` sirve a los reportes. |

## Cómo se conecta con los demás módulos

El módulo no importa archivos internos de nadie. Lo que depende de otros se registra desde **el módulo dueño** con
`import { integraciones } from '../cuenta/index.js'` (ver `integraciones.js`):

| Quién | Qué registra | Mientras no lo haga |
| --- | --- | --- |
| Laura (reservas/pagos) | `registrarReservas({ obtener(id) → { id, viajeroId, cuidadorId, estado } })` | Las reseñas responden 503 «estarán disponibles cuando el módulo de reservas esté activo». |
| Laura (HU-38) | `registrarVerificacionPazYSalvo(codigo, consultar)` para `reservas_activas`, `pagos_pendientes`, `disputas_abiertas`, `saldo_sin_liquidar` | **No hay pendientes**: hoy cualquiera puede desactivar su cuenta. Es lo primero que hay que conectar. |
| Diego (HU-08) | `registrarCierreDeSesiones(fn(usuarioId))` | Igual funciona: `autenticar.js` mira `status` en cada petición. |
| Vanesa (HU-13) | `registrarAntecedentes(fn(usuarioId) → boolean)` | La reactivación no avisa de antecedentes vencidos. |

Funciones que **otros** pueden usar: `canalesActivos(usuarioId, evento)` (por dónde avisar a un usuario),
`suspenderCuenta({ usuarioId, adminId, detalle })` (HU-14: deja el historial con origen `admin` y evita que la
persona se reactive sola) y, en el frontend, `formatearPrecio(valor, moneda)` y `rutaResena(reservaId)`.

Para que RN-5 se cumpla en la búsqueda: filtrar siempre `usuarios.status = TRUE` (oculta el perfil de cuentas desactivadas).

## Instalación

1. Ejecutar `backend/src/db/02_cuenta.sql` después de `01_usuarios.sql` (es idempotente). Agrega `usuarios.foto_url`, el
   trigger que **impide borrar usuarios**, y las tablas `cuenta_codigos`, `preferencias_notificacion`, `resenas`,
   `cuenta_eventos` y la vista `v_historial_cuentas`.2. `cd backend && npm install` (nuevas: `zod`, `multer`, `express-rate-limit`, `nodemailer`, y `supertest` en desarrollo).
3. Correo: sin `SMTP_HOST` en el `.env`, **en desarrollo los correos (con los códigos) se imprimen en la consola del
   backend**. En producción sin SMTP el envío falla a propósito. Variables en `.env.example`.

## Pruebas

```bash
# Backend: 68 pruebas (unitarias + HTTP contra PostgreSQL real)
# Crear antes una base vacía llamada red_cuidadores_test; las pruebas se niegan a correr si el nombre no acaba en _test
cd backend
TEST_DB_PASSWORD=su-clave npm test          # PowerShell: $env:TEST_DB_PASSWORD='su-clave'; npm test
# Variables opcionales: TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_NAME

# Frontend: utilidades puras (formato de moneda, validaciones)
cd frontend && npm test
```

## Diseño: mockups de `Mockups_Red_de_Cuidadores.pdf`

Seguí las pantallas 9, 11, 12, 14, 16, 17 y 18. Diferencias a propósito:

- **Mockup 11 (Configuración):** solo están las filas de mi módulo. «Cambiar contraseña», «Seguridad» (Diego),
  «Métodos de pago» y «Centro de ayuda» las suma quien tenga esas pantallas en `CuentaPage.jsx`. La barra inferior
  (Inicio · Reservas · Mensajes · Perfil) es de `shared`/Laura.
- **Mockup 17 (Idioma, país y moneda):** el selector de idioma comparte pantalla con HU-34 (Vanesa). Guarda
  `usuarios.idioma` (`es`, `en`, `pt`); traducir la interfaz es de ella.
- **Mockup 18:** el texto «Perderás tu perfil, tus mascotas... Esta acción no se puede deshacer» contradice RN-5; ahora
  dice que nada se borra. Se agregó el motivo (HU-39 lo exige) y «Mejor me quedo» se conserva.
- **Reseñas (HU-33), reactivar (HU-40) y cuentas desactivadas (HU-41):** no tienen mockup; siguen el mismo sistema visual.

## Decisiones y pendientes por confirmar

- **Conversión de moneda (HU-35):** el frontend solo da formato al valor en la moneda elegida; convertir entre monedas
  necesita una fuente de tasas de cambio que el proyecto no define.
- **Supresión (habeas data):** hoy basta con desactivar (RN-5). La pregunta abierta al docente sigue pendiente.
- **Reenvío del código de HU-40 y su contador de intentos:** los errores son genéricos a propósito (anti-enumeración),
  por eso no muestra «te quedan N intentos» como HU-06.
- **Cambios fuera de mi carpeta** (mínimos, para que el módulo funcione): una línea en `backend/src/server.js`, una en
  `frontend/src/App.jsx`, `.env.example`, `.gitignore` (`uploads`) y `package.json`. Falta que alguien enlace
  `/cuenta` desde la pantalla de inicio y «¿Quieres reactivarla?» (`/reactivar`) desde el login.
- Sugerencia para `shared`: `AuthContext` no tiene `actualizarUsuario`; el módulo actualiza `localStorage.usuario`
  directamente (`sincronizarSesion`), pero la sesión en memoria se refresca al recargar.
