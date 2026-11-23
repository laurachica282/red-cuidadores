# Red de Cuidadores

Plataforma para que viajeros encuentren cuidadores de confianza para sus mascotas. Proyecto del curso de Sistemas Distribuidos (Universidad Central).

- **frontend**: React + Vite (JavaScript), organizado por módulos, en español, inglés y portugués.
- **backend**: Node.js + Express + PostgreSQL. Sesión con token (JWT), verificación por correo, 2FA e inicio con Google o Microsoft.
- **Despliegue**: servidor en Render, base de datos y archivos en Supabase, correos con la API de Brevo.

## Requisitos

Instala esto antes de empezar:

| Programa | Versión | Para qué |
| --- | --- | --- |
| Node.js | 20 o superior | Correr el frontend y el backend |
| Git | Cualquiera reciente | Control de versiones |
| PostgreSQL (con pgAdmin) | 15 o superior | Base de datos |

Para comprobar Node y Git, abre una terminal y escribe `node -v` y `git --version`.

> Consejo: clona el proyecto en una carpeta **fuera de OneDrive** (por ejemplo `C:\proyectos`). OneDrive intenta sincronizar `node_modules` y todo se vuelve lento.

## Estructura

```
red-cuidadores/
├─ backend/
│  └─ src/
│     ├─ db/                scripts SQL numerados (01_usuarios.sql … 22_…) y scripts de datos de demostración
│     ├─ db.js              conexión a PostgreSQL (DB_* en local, DATABASE_URL en la nube)
│     ├─ server.js          servidor Express: registra la API de cada módulo
│     ├─ shared/            piezas que usan varios módulos (correo, archivos, fechas)
│     └─ modules/           un módulo por responsable:
│        auth · cuenta · cuidadores · region · mascotas · busqueda · seguimiento · reservas · pagos
└─ frontend/
   └─ src/
      ├─ shared/            estilos, íconos, cliente de la API y barra de navegación (lo comparte todo el equipo)
      ├─ modules/           un módulo por responsable (auth, cuenta, reservas, pagos...)
      ├─ App.jsx            junta las rutas de todos los módulos
      └─ main.jsx
```

Cada módulo del backend tiene su propio `README.md` cuando hace falta (por ejemplo `backend/src/modules/cuenta/README.md`).

## Instalación paso a paso

### 1. Clonar el proyecto

```bash
git clone https://github.com/laurachica282/red-cuidadores.git
cd red-cuidadores
```

### 2. Backend

```bash
cd backend
npm install
```

Crea el archivo `.env` copiando `.env.example` y llena los valores mínimos:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=red_cuidadores
DB_USER=postgres
DB_PASSWORD=la-contraseña-de-tu-postgres
JWT_SECRET=una-frase-larga-y-secreta
```

Para generar un `JWT_SECRET` aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> El archivo `.env` es personal y **no se sube a Git**. Sin datos de correo, los códigos de 6 dígitos (verificación, cambio de correo, reactivación) **se imprimen en la consola del backend**, así que no necesitas configurar correo para probar.

### 3. Crear la base de datos

La forma rápida, con PostgreSQL encendido y el `.env` listo:

```bash
npm run db:crear              # crea la base, ejecuta los scripts numerados en orden y carga datos de prueba
npm run db:crear -- --reset   # BORRA la base y la vuelve a crear desde cero
npm run db:crear -- --sin-datos
```

La forma manual (pgAdmin): crea la base `red_cuidadores` (**Databases → Create → Database…**) y ejecuta en el **Query Tool** cada archivo de `backend/src/db/` **en orden numérico**. Cada vez que alguien agregue un script nuevo (`23_...sql`), hay que ejecutarlo en el mismo orden.

Para una base nueva en la nube (por ejemplo Supabase), `npm run db:esquema` une todos los scripts en un solo archivo, `esquema_completo.sql`, que se pega una sola vez en el editor SQL.

### 4. Datos de demostración (opcional)

```bash
npm run db:poblar      # cuidadores, viajeros, mascotas, reservas, reseñas, reportes y pagos de ejemplo
npm run db:fotos       # fotos para esas cuentas
npm run db:cuentas     # genera cuentas_demo.md (en la raíz, fuera de git) con todas las cuentas
```

Todas las cuentas de demostración usan el correo `…@demo.redcuidadores.co` y la contraseña `Demo2026`.

### 5. Arrancar el backend

```bash
npm run dev
```

Debe decir `API lista en http://localhost:3000`. Para comprobar la conexión con la base, abre <http://localhost:3000/api/salud>: debe responder `{"ok":true,...}`.

### 6. Frontend

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

Abre <http://localhost:5173>. Te lleva al login. Si el backend no está en `http://localhost:3000`, crea `frontend/.env` con `VITE_API_URL=http://tu-servidor/api`.

### 7. Crear un usuario de prueba

Con el backend corriendo, en PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/registro -ContentType "application/json" -Body '{"nombre":"Tu Nombre","correo":"tu@correo.com","clave":"Luna2026ok","rol":"viajero"}'
```

La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número. El registro pide verificar el correo con un código de 6 dígitos (míralo en la consola del backend). Si prefieres no registrarte, entra con una cuenta de demostración.

## Pruebas

```bash
# Backend: pruebas automáticas contra PostgreSQL real. Crea antes una base vacía llamada red_cuidadores_test
# (las pruebas se niegan a correr si el nombre de la base no termina en _test).
cd backend
TEST_DB_PASSWORD=la-contraseña npm test        # PowerShell: $env:TEST_DB_PASSWORD='...'; npm test

# Frontend
cd frontend
npm test
npm run lint
```

## Módulos y responsables

Cada persona trabaja solo dentro de la carpeta de su módulo (`frontend/src/modules/<módulo>` y `backend/src/modules/<módulo>`).

| Módulo | Responsable | Historias |
| --- | --- | --- |
| `app` y `shared` | Laura Chica | Rutas, diseño base, cliente API e idiomas |
| `auth` | Diego | HU-01 a HU-05, HU-07, HU-08 |
| `cuenta` | Daniel Páez | HU-06, HU-09, HU-32, HU-33, HU-37, HU-39 a HU-41 |
| `cuidadores` y `region` | Vanesa Acevedo | HU-10 a HU-14, HU-34, HU-36 |
| `mascotas` | Marcela Gómez | HU-23 a HU-27, HU-29 |
| `busqueda` y `seguimiento` | Brayan Miranda | HU-15, HU-16, HU-28, HU-30, HU-31 |
| `reservas` y `pagos` | Laura Chica | HU-17 a HU-20, HU-38 |
| `pagos/liquidaciones` | Brayan Miranda | HU-21, HU-22 |

### Reglas de los módulos

- Cada persona edita solo su módulo. `shared` y `app` los cambia Laura; si necesitas algo ahí, pídelo.
- Un módulo no importa archivos internos de otro; solo lo que ese módulo expone en su `index.js`.
- Cuando un módulo necesita datos de otro, lo hace con **enganches** que el módulo dueño registra (por ejemplo, reservas y pagos registran en `cuenta` sus verificaciones de paz y salvo). Así los módulos se pueden separar en procesos más adelante.
- Cada módulo registra sus rutas en su `routes.jsx` y las exporta en el `index.js`. Para sumar un módulo, se agrega a la lista `modulos` de `App.jsx`.
- Los colores y estilos base están en `frontend/src/shared/styles/theme.css`. Úsalos para que todas las pantallas se vean iguales a los mockups.
- Los íconos reutilizables están en `frontend/src/shared/components/Icons.jsx`.

## Cómo trabajamos en Git

1. Parte siempre desde `main` actualizado:

   ```bash
   git checkout main
   git pull
   git checkout -b feature/tu-modulo
   ```

2. Haz commits pequeños, con mensajes claros:

   ```bash
   git add .
   git commit -m "Describe lo que hiciste"
   git push -u origin feature/tu-modulo
   ```

3. En GitHub abre un **Pull Request** hacia `main`. Laura lo revisa y lo une.
4. Nunca subas directo a `main` ni subas el archivo `.env`.

Ramas por persona:

| Integrante | Rama |
| --- | --- |
| Diego | `feature/auth` |
| Daniel | `feature/cuenta` |
| Vanesa | `feature/cuidadores`, `feature/region` |
| Marcela | `feature/mascotas` |
| Brayan | `feature/busqueda`, `feature/seguimiento` |
| Laura | `feature/reservas`, `feature/pagos` |

## Reglas de negocio importantes

- Las cuentas **no se eliminan**: cerrar una cuenta cambia `status = false` (la base de datos impide borrar usuarios). Para cerrarla se exige paz y salvo (sin reservas activas, pagos pendientes, disputas ni saldo sin liquidar).
- La pasarela de pagos se elige por país, según la geolocalización del usuario. El prototipo usa una pasarela **simulada** (`backend/src/modules/pagos/simulador.js`): no mueve dinero real.
- El pago queda **retenido** hasta que termina el servicio; luego se libera: 85 % para el cuidador y 15 % para la plataforma.
- Un cuidador no puede tener dos reservas confirmadas que se crucen en fechas, y una reserva solo tiene un pago vigente (lo garantiza la base de datos).
- Los cuidadores solo aparecen en la búsqueda con los antecedentes aprobados.
- Las mascotas finas exigen cuidador verificado con 2FA, Garantía Plus y entrega con código.
- El idioma, el país y la moneda salen de la región del usuario.
- Solo el viajero de una reserva completada puede dejar una reseña, y solo una por reserva.

## Despliegue

Variables que cambian en la nube (están en `backend/.env.example`):

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión completa de Supabase; si está, se usa en vez de `DB_*` y con SSL |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Archivos subidos (fotos, comprobantes, reportes). Obligatorias en Render: su disco se borra en cada despliegue |
| `BREVO_API_KEY` | Correos por la API de Brevo (Render bloquea SMTP) |
| `FRONTEND_URL` | Dirección del sitio, para permitirla en CORS |

En el frontend, `VITE_API_URL` apunta a la API desplegada. La base de Supabase debe tener **todos** los scripts numerados de `backend/src/db/` (o `esquema_completo.sql`).

## Problemas comunes

| Mensaje | Causa | Solución |
| --- | --- | --- |
| `database "red_cuidadores" does not exist` | No se creó la base (o se creó como "servidor" en pgAdmin) | Correr `npm run db:crear` o crearla en **Databases → Create → Database** |
| `password authentication failed` | La clave del `.env` no coincide con la de PostgreSQL | Corregir `DB_PASSWORD` y reiniciar el backend |
| `ECONNREFUSED` | PostgreSQL apagado o con otro puerto | Encender el servicio `postgresql` en Windows |
| `relation "..." does not exist` / `no existe la tabla` | Falta ejecutar algún script de `backend/src/db/` | Ejecutarlos todos en orden (o `npm run db:crear -- --reset` en local) |
| El `.env` no se lee | Se llama `.env.txt` o está fuera de `backend` | Renombrarlo y dejarlo dentro de `backend` |
| `Failed to resolve import ... Does the file exist?` | Falta un archivo o el nombre no coincide | Revisar mayúsculas, extensión y carpeta |
| El login dice "No hay conexión con el servidor" | El backend no está corriendo | Correr `npm run dev` en `backend` |
| Cambié el `.env` y no pasa nada | El `.env` solo se lee al arrancar | Detener con `Ctrl + C` y volver a correr `npm run dev` |
| No me llega el código por correo | Sin datos de correo en el `.env` | En desarrollo el código sale en la consola del backend |
