# Red de Cuidadores

Plataforma para que viajeros encuentren cuidadores de confianza para sus mascotas. Proyecto del curso de Sistemas Distribuidos (Universidad Central).

- **frontend**: React + Vite (JavaScript), organizado por módulos.
- **backend**: Node.js + Express + PostgreSQL, con login por correo y contraseña (JWT).

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
│  ├─ db/                 scripts SQL (01_usuarios.sql, ...)
│  └─ src/
│     ├─ db.js            conexión a PostgreSQL
│     ├─ server.js        servidor Express
│     └─ modules/auth/    registro y login
└─ frontend/
   └─ src/
      ├─ shared/          estilos, íconos y cliente de la API (lo comparte todo el equipo)
      ├─ modules/         un módulo por responsable (auth, cuenta, pagos...)
      ├─ App.jsx          junta las rutas de todos los módulos
      └─ main.jsx
```

## Instalación paso a paso

### 1. Clonar el proyecto

```bash
git clone https://github.com/USUARIO/red-cuidadores.git
cd red-cuidadores
```

### 2. Crear la base de datos

1. Abre **pgAdmin** e ingresa la contraseña de `postgres`.
2. En el panel izquierdo: **Servers → PostgreSQL → Databases**.
3. Clic derecho en **Databases → Create → Database…**, nombre `red_cuidadores`, y **Save**.
4. Clic derecho en `red_cuidadores` → **Query Tool**. Abre el archivo `backend/db/01_usuarios.sql`, copia su contenido, pégalo en el editor y pulsa ▶ (o `F5`).
5. Comprueba con `SELECT * FROM usuarios;`: debe mostrar las columnas, sin filas.

Cada vez que alguien agregue un script nuevo en `backend/db/` (`02_...sql`, `03_...sql`), hay que ejecutarlo en el mismo orden.

### 3. Backend

```bash
cd backend
npm install
```

Crea el archivo `.env` copiando `.env.example` y llena los valores:

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

Arranca el servidor:

```bash
npm run dev
```

Debe decir `API lista en http://localhost:3000`. Para comprobar la conexión con la base, abre <http://localhost:3000/api/salud>: debe responder `{"ok":true,...}`.

> El archivo `.env` es personal y **no se sube a Git**.

### 4. Frontend

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

Abre <http://localhost:5173>. Te lleva al login.

### 5. Crear un usuario de prueba

Con el backend corriendo, en PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/registro -ContentType "application/json" -Body '{"nombre":"Tu Nombre","correo":"tu@correo.com","clave":"Luna2026ok","rol":"viajero"}'
```

La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número. Después entra al login del frontend con ese correo y contraseña.

## Módulos y responsables

Cada persona trabaja solo dentro de la carpeta de su módulo (`frontend/src/modules/<módulo>`).

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

- Las cuentas **no se eliminan**: cerrar una cuenta cambia `status = false`. Para cerrarla se exige paz y salvo (sin reservas activas, pagos pendientes, disputas ni saldo sin liquidar).
- La pasarela de pagos se elige por país, según la geolocalización del usuario.
- Los cuidadores solo aparecen en la búsqueda con los antecedentes aprobados.
- Las mascotas finas exigen cuidador verificado con 2FA, Garantía Plus y entrega con código.
- El idioma, el país y la moneda salen de la región del usuario.

## Problemas comunes

| Mensaje | Causa | Solución |
| --- | --- | --- |
| `database "red_cuidadores" does not exist` | No se creó la base (o se creó como "servidor" en pgAdmin) | Crearla en **Databases → Create → Database** |
| `password authentication failed` | La clave del `.env` no coincide con la de PostgreSQL | Corregir `DB_PASSWORD` y reiniciar el backend |
| `ECONNREFUSED` | PostgreSQL apagado o con otro puerto | Encender el servicio `postgresql` en Windows |
| El `.env` no se lee | Se llama `.env.txt` o está fuera de `backend` | Renombrarlo y dejarlo dentro de `backend` |
| `Failed to resolve import ... Does the file exist?` | Falta un archivo o el nombre no coincide | Revisar mayúsculas, extensión y carpeta |
| El login dice "No hay conexión con el servidor" | El backend no está corriendo | Correr `npm run dev` en `backend` |
| Cambié el `.env` y no pasa nada | El `.env` solo se lee al arrancar | Detener con `Ctrl + C` y volver a correr `npm run dev` |
