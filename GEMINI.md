# GEMINI.md - FestiGeek MVP

## Project Overview

This project is a web application for "FestiGeek Canarias 2025", serving as a landing page with an integrated ticket selling system.

**Key Technologies:**

*   **Framework:** Astro 4
*   **Styling:** Tailwind CSS
*   **Database:** PostgreSQL with Drizzle ORM
*   **Payments:** Stripe
*   **Containerization:** Docker and Docker Compose

**Architecture:**

The application is a server-side rendered Astro project. It includes API routes for handling Stripe checkout sessions and webhooks. The database schema is managed with Drizzle ORM, and the entire environment is containerized for consistent development and deployment.

## Building and Running

The project is designed to be run with Docker.

**1. Initial Setup:**

*   Copy `.env.example` to `.env` and fill in your Stripe API keys.
*   Run `docker compose up -d` to build and start the services.
*   Apply database migrations: `docker compose exec app npm run db:push`

**2. Key `npm` Scripts:**

The following scripts are available in `package.json` and can be run inside the `app` container (`docker compose exec app npm run <script>`):

*   `dev`: Starts the development server.
*   `dev:local`: Starts the development server with a specific local configuration.
*   `build`: Builds the application for production.
*   `db:generate`: Generates database migration files.
*   `db:push`: Applies database migrations.
*   `db:studio`: Opens the Drizzle Studio to view and manage the database.

**3. Running the Application:**

*   Start the services: `docker compose up -d`
*   Access the application at `http://localhost:4321`.

## Development Conventions

*   **Configuration:** The project uses `astro.config.mjs` for the main configuration and `astro.config.local.mjs` for local development overrides (e.g., enabling SSR).
*   **Database:** The database schema is defined in `src/db/schema.ts`. Migrations are managed by `drizzle-kit`.
*   **API:** Stripe integration is handled via API routes in `src/pages/api/`.
*   **Static Assets:** Public assets like images are stored in the `public/` directory.

---

## Historial de Despliegue (Sesión Anterior)

En la sesión anterior, se realizó el proceso de desplegar una versión estática del sitio en GitHub Pages en un nuevo repositorio (`eventoevolve`). Se encontraron y solucionaron varios problemas:

### 1. Fallo de Build: `DATABASE_URL no definida`
*   **Causa:** El proceso de build estático de Astro intentaba procesar las rutas de la API (`/src/pages/api/`) que contienen código de servidor y requieren una conexión a la base de datos, la cual no está disponible en el entorno de GitHub Pages.
*   **Solución:** Se refactorizó el archivo `src/pages/api/webhooks.ts` para utilizar un **import dinámico** (`await import(...)`). Esto evita que la conexión a la base de datos se inicialice durante el build, solucionando el fallo.

### 2. Error de Rutas: CSS no se cargaba
*   **Causa:** Después de solucionar el build, los estilos no se cargaban porque la configuración en `astro.config.mjs` (`base: "/eventotickets"`) apuntaba al nombre del repositorio antiguo.
*   **Solución:** Se actualizó la propiedad `base` a `"/eventoevolve"` para que coincidiera con el nuevo repositorio, corrigiendo las rutas a los assets como el CSS.

### 3. Error de Imágenes: No se mostraban
*   **Causa 1 (Rutas incorrectas):** Las rutas a las imágenes en `index.astro` incluían el prefijo `/public/`, lo cual es incorrecto.
*   **Causa 2 (Estilos en línea):** Las imágenes de los invitados, al estar en atributos `style` en línea, no eran procesadas por Astro, por lo que sus rutas no se corregían automáticamente.
*   **Solución (sugerida por el usuario):** Se movieron todos los estilos de las imágenes desde los atributos `style` en línea a clases de CSS dedicadas dentro de la etiqueta `<style>` principal en `index.astro`. Esto centraliza los estilos y permite que Astro procese y corrija todas las rutas de las imágenes durante el build.

---

## Historial de Despliegue (Sesión Actual)

En esta sesión, se continuó depurando el problema de las imágenes de los invitados en el despliegue de GitHub Pages.

### 1. Corrección de CSS de Imágenes
*   **Problema:** Las imágenes de fondo de las tarjetas de invitados no se escalaban correctamente (`background-size: cover` no funcionaba).
*   **Intento de solución:** Se refactorizó el CSS de las clases `.guest-bg-*` para usar propiedades de `background` individuales (`background-image`, `background-position`, etc.) en lugar de la propiedad abreviada `background`.

### 2. Problemas de Sincronización con `main`
*   **Problema:** Al intentar subir el cambio, se encontraron múltiples conflictos con la rama `main`, que había sido actualizada remotamente.
*   **Solución:** Siguiendo instrucciones, se forzó el push (`git push --force`) para sobreescribir la rama remota con la versión local que contenía la corrección.

### 3. Error Crítico Post-Despliegue: CSS no se carga
*   **Causa:** Después del `force push`, el sitio desplegado apareció sin estilos. La investigación reveló que, a pesar de que `astro.config.mjs` era correcto, existían múltiples **rutas hardcodeadas** en `src/pages/index.astro` que apuntaban al antiguo repositorio (`/eventotickets/`) en lugar del nuevo (`/eventoevolve/`).
*   **Solución Aplicada:** Se reemplazaron todas las instancias de `/eventotickets/` por `/eventoevolve/` en el archivo `src/pages/index.astro`.

### 4. Estado Actual: Pendiente de Despliegue Final
*   **Estatus:** El código ha sido corregido en local.
*   **Próximo Paso:** Realizar el `commit` y `push` de la corrección de las rutas a la rama `main` y verificar el despliegue final en GitHub Pages. Se espera que esto solucione tanto el problema del CSS como el problema original de las imágenes.