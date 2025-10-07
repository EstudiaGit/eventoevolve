# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

# FestiGeek Canarias 2025 - MVP

Landing page con sistema de venta de entradas.

## 🚀 Inicio Rápido

````bash
# Clonar el repositorio
git clone <tu-repo>
cd festivgeek-mvp

# Copiar variables de entorno
cp .env.example .env
# Edita .env con tus claves de Stripe

# Levantar con Docker
docker compose up -d

# Ver logs
docker compose logs -f app

# Acceder a la aplicación
http://localhost:4321


# Instalar dependencias (dentro del container)
docker compose exec app npm install

# Aplicar migraciones de BD
docker compose exec app npm run db:push

# Ver base de datos
docker compose exec app npm run db:studio

# Reiniciar la app
docker compose restart app

# Parar todo
docker compose down

# Parar y borrar volúmenes (RESET COMPLETO)
docker compose down -v

Estructura del Proyecto
src/
├── pages/              # Rutas de la aplicación
│   ├── index.astro     # Página principal
│   └── api/            # API endpoints
├── components/         # Componentes reutilizables
├── layouts/            # Layouts de página
└── db/                 # Base de datos
    ├── schema.ts       # Esquema de tablas
    └── client.ts       # Cliente de conexión

🧩 Stack Tecnológico

* Framework: Astro 4
* Estilos: Tailwind CSS
* Base de Datos: PostgreSQL + Drizzle ORM
* Pagos: Stripe
* Containerización: Docker + Docker Compose


---

## 📂 PASO 2: Estructura de carpetas completa

Asegúrate de que tienes esta estructura:

```bash
festivgeek-mvp/
├── .env                          # (crear, no commitear)
├── .env.example                  # (ya lo tienes del mensaje anterior)
├── .gitignore                    # ✅ Crear ahora
├── .dockerignore                 # (ya lo tienes)
├── docker-compose.yml            # (ya lo tienes)
├── Dockerfile                    # (ya lo tienes)
├── package.json                  # ✅ Crear ahora
├── astro.config.mjs             # ✅ Crear ahora
├── tsconfig.json                # ✅ Crear ahora
├── tailwind.config.mjs          # ✅ Crear ahora
├── drizzle.config.ts            # (ya lo tienes)
├── README.md                     # ✅ Crear ahora
│
├── src/
│   ├── pages/
│   │   └── index.astro          # ✅ Crear ahora
│   ├── components/              # (vacío por ahora)
│   ├── layouts/                 # (vacío por ahora)
│   └── db/
│       ├── schema.ts            # (ya lo tienes)
│       └── client.ts            # (ya lo tienes)
│
├── public/                       # (vacío, aquí van imágenes estáticas)
│
└── drizzle/                      # (se genera automáticamente)

## Gracias.
````
