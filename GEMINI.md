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
